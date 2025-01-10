
function findComponentAttribute(schema, componentName) {
  const attributes = schema.attributes;
  const attributeNames = [];
  for (const [attributeName, attributeValue] of Object.entries(attributes)) {
    if (attributeValue.type === 'component' && 
        attributeValue.component === componentName) {
        attributeNames.push({ [attributeName]: componentName});
    }
  }
  
  return attributeNames;
}

/**
 * Expands the populate fields for a given component, recursively replacing component names
 * with their respective populate fields unless the component is the original component.
 *
 * @param {Array} componentsList - The list of components containing their populate fields.
 * @param {string} componentName - The name of the component to expand.
 * @param {string} originalComponent - The original component name to avoid expanding it.
 * @returns {Array|null} - Returns an array of expanded populate fields or null if the original component is reached.
 */
const expandComponentPopulate = (componentsList, componentName, originalComponent) => {
  // Base case: if this is the target component or not found, return null
  if (componentName === originalComponent) {
    return null;
  }

  // Find the component in our list
  const componentData = componentsList.find(item => 
    Object.keys(item)[0] === componentName
  );

  if (!componentData) {
    return null;
  }

  // Get the populate fields for this component
  const populateFields = componentData[componentName].populate;

  // Process each populate field
  const expandedPopulate = populateFields.map(field => {
    const fieldName = Object.keys(field)[0];
    const fieldComponent = field[fieldName];
    
    // Recursively expand the referenced component
    const expandedComponent = expandComponentPopulate(componentsList, fieldComponent, originalComponent);
    
    if (expandedComponent === null) {
      // If it's a leaf node or target component, return the original field
      return fieldName;
    } else {
      // Otherwise return the expanded structure
      return {
        [fieldName]: {
          populate: expandedComponent
        }
      };
    }
  });
  if (expandedPopulate.every(element => typeof element === "string"))
    return expandedPopulate;
  else
    return expandedPopulate[0];
};

/**
 * Exapnds the populate field for the components in the list
 *
 * @param {Array} componentsList - The list of components to process.
 * @param {string} originalComponentUID - The original component UID to avoid expanding it.
 * @returns {Array} - Returns a new list of components with their populate fields expanded.
 */
const expandComponentsListPopulatePart = (componentsList, originalComponentUID) => {
  return componentsList.map(componentObj => {
    const componentName = Object.keys(componentObj)[0];
    const expandedPopulate = expandComponentPopulate(componentsList, componentName, originalComponentUID);
    return {
      [componentName] : {
        populate: expandedPopulate || componentObj[componentName].populateFields
      }
    };
  });
};

/**
 * Retrieves the containing components for a given component UID, expanding their populate structure.
 *
 * @param {string} componentUid - The UID of the component to find containing components for. 
 * @returns {Promise<Array>} - Returns a promise that resolves to an array of components with their populate structure.
 */
const getContainingComponentsWithPopulateStructure = async (componentUid) => {
  const componentsList = await getListOfComponentsContainingAComponent(componentUid);
  const processedList = expandComponentsListPopulatePart(componentsList, componentUid);
  for (let k=0; k<processedList.length; k++) {
    const item = processedList[k];

  }
  return processedList;
};

/**
 * Gets a list of components that contain a specific component by its UID.
 *
 * @param {string} componentUid - The UID of the component to search for.
 * @returns {Promise<Array>} - Returns a promise that resolves to an array of components containing the specified component.
 */
const getListOfComponentsContainingAComponent = async (componentUid) => {
  const allComponents = strapi.plugin('content-manager').service('components').findAllComponents();
  const containingComponents = [];
  for (let r = 0; r< allComponents.length; r++) {
    const comp = allComponents[r];
    const attributesContainingComponent = findComponentAttribute(comp, componentUid)
    if (comp.uid !== componentUid && attributesContainingComponent.length > 0) {
      containingComponents.push({
        [comp.uid] : {
          populate: attributesContainingComponent
        }
        });
      const containingChildrenList = await getListOfComponentsContainingAComponent(comp.uid);
      containingChildrenList.map((c) => containingComponents.push(c));
    }
  }
  return containingComponents;
}

const getCollectionsWithComponentsPopulate = async (componentUid, componentPopulateStructure) => {
  let collectionsContainingComponentDefinition = [];
  const allCollections =  strapi.plugin('content-manager').service('content-types').findAllContentTypes();
  for (let k=0; k<allCollections.length; k++) {
    const selectedCollection = allCollections[k]; 
    const selCollAttributes = selectedCollection.attributes;
    const selCollAttributesList = Object.keys(selCollAttributes);
    for (let r=0; r<selCollAttributesList.length; r++) {
      const attribute =selCollAttributesList[r];
      if (selCollAttributes[attribute].type === 'dynamiczone') {
        const dynCompList = selCollAttributes[attribute]['components'];
        if (dynCompList.includes(componentUid)) {
          collectionsContainingComponentDefinition.push({
            uid: selectedCollection.uid,
            displayName: selectedCollection?.info?.displayName || selectedCollection.uid,
            definition : selectedCollection,
            matchingAttributeName: attribute,
            matchType: 'dynamiczone',
            populateObject: componentPopulateStructure
          });
          //break;
        }
      }
      else if (selCollAttributes[attribute].type === 'component' && selCollAttributes[attribute].component == componentUid) {
        collectionsContainingComponentDefinition.push({
          uid: selectedCollection.uid,
          displayName: selectedCollection?.info?.displayName || selectedCollection.uid, 
          definition : selectedCollection,
          matchingAttributeName: attribute,
          matchType: 'component',
          populateObject: componentPopulateStructure
        });
        //break;
      }
    }
  }
  return collectionsContainingComponentDefinition;
}

const isInternalComponentPopulated = (dataItem, populateObject) => {

  const pObject = populateObject[Object.keys(populateObject)[0]]['populate'];

  //dataItem will be array for dynamicZone items and not an array for component items.
  if (Array.isArray(dataItem)) {
    for (let k=0; k< dataItem.length; k++) {
      const dynamicZoneItemContains = isInternalComponentPopulated(
        dataItem[k],
        {[dataItem[k]['__component']] : { populate: pObject} }
      )
      if (dynamicZoneItemContains)
        return true;
    }
    return false;
  }  
  else {
    if (Array.isArray(pObject) && pObject.every(p => typeof p === 'string')) {
      for (let r = 0; r < pObject.length; r++ ) {
        const populateParam = pObject[r];
        if (dataItem[populateParam])
          return true;
      }
      return false;
    }
    else if (pObject === '*')
    {
      if (dataItem)
        return true;
      else
        return false;
    }
    else if (typeof pObject === 'object' && pObject !== null) {
      const topLevelPopulateFieldName = Object.keys(pObject)[0];
      if (typeof dataItem[topLevelPopulateFieldName] !== 'undefined' &&
        dataItem[topLevelPopulateFieldName] !== null
      ) {
        return isInternalComponentPopulated(
          dataItem[topLevelPopulateFieldName], 
          pObject
        )
      }
      else
        return false;
    }
    console.log('>> Potential pending match case for component type.');
  }
  return false;
}

const deduplicateRowsByDocumentId = (collectionsList) => {
  const map = new Map();
  collectionsList.forEach(item => {
    const keyValue = item.data.documentId;
    if (map.has(keyValue)) {
      const existingItem = map.get(keyValue);
      existingItem.data.locales = Array.from(new Set([...item.data.locales, ...existingItem.data.locales]));
    }
    else map.set(keyValue, {...item});
  });
  return Array.from(map.values());
}

const getCollectionsHavingComponentData = async (collectionObject, componentToLookFor) => {
  const collectionsContainingComponentData = [];
  const locales = await strapi.plugin('i18n').service('locales').find();
  const localeCodes = locales.map(l => l.code);
  const curCollection = collectionObject;
  for (let w=0; w< localeCodes.length; w++) {
    const allItems = await strapi.documents(curCollection.uid).findMany({
          populate: curCollection.matchType === 'dynamiczone' ? {
            [curCollection.matchingAttributeName] : {
              on : curCollection.populateObject
            }
          } :  {
            [curCollection.matchingAttributeName] : Object.values(curCollection.populateObject)[0]
          },
          locale: localeCodes[w]
    });     
    for (let r=0; r<allItems.length; r++) {
      const item = allItems[r];
      if (curCollection.matchType === 'dynamiczone') {
        for (let i=0; i<item[curCollection.matchingAttributeName].length; i++) {
          const dynamicZoneItem = item[curCollection.matchingAttributeName][i];
          if (dynamicZoneItem['__component'] === componentToLookFor) {
            let itemAdded = false;
            collectionsContainingComponentData.map((c) => {
              if (c['data'].documentId === item.documentId 
                && !c['data'].locales.includes(item.locale)) {
                c['data'].locales.push(item.locale);
                itemAdded = true;
              }
            });
            if (!itemAdded) {
              collectionsContainingComponentData.push({
                'uid' : curCollection.uid,
                'collection_display_name' : curCollection.displayName,
                'data' : {
                  documentId: item.documentId,
                  locales: [item.locale]
                }
              });  
            }
            break;
          }
          else if (isInternalComponentPopulated(item[curCollection.matchingAttributeName], 
            curCollection.populateObject)) {
            let itemAdded = false;
            collectionsContainingComponentData.map((c) => {
              if (c['data'].documentId === item.documentId 
                  && !c['data'].locales.includes(item.locale)) {
                c['data'].locales.push(item.locale);
                itemAdded = true;
              }
            });
            if (!itemAdded) {
              collectionsContainingComponentData.push({
                'uid' : curCollection.uid,
                'collection_display_name' : curCollection.displayName,
                'data' : {
                  documentId: item.documentId,
                  locales: [item.locale]
                }
              });  
            }
            break;
          }          
        }
      }
      else if (curCollection.matchType === 'component') {
        if (Object.keys(item).includes(curCollection.matchingAttributeName) &&
              item[curCollection.matchingAttributeName] &&
                isInternalComponentPopulated(item[curCollection.matchingAttributeName], 
                  curCollection.populateObject)) {
                let itemAdded = false;
                collectionsContainingComponentData.map((c) => {
                  if (c['data'].documentId === item.documentId 
                    && !c['data'].locales.includes(item.locale))
                    {
                      c['data'].locales.push(item.locale);
                      itemAdded = true;
                    }
                });
                if (!itemAdded) {
                  collectionsContainingComponentData.push({
                    'uid' : curCollection.uid,
                    'collection_display_name' : curCollection.displayName,
                    'data' : {
                      documentId: item.documentId,
                      locales: [item.locale]
                    }
                  });  
                }
              }
          }        
        }
  }
  return handleNullLocales(collectionsContainingComponentData);
}
  
const handleNullLocales = (collectionList) => {
  return collectionList.map(c => {
    const result = {...c};
    result.data.locales = result.data.locales.filter(i => i !== null);
    return result;
  });
}

const controller = ({ strapi }) => ({
    listComponents(ctx) {
        const allComponents = strapi.plugin('content-manager').service('components').findAllComponents();
        const allCompoentsUids = allComponents.map((component) => component.uid);
        ctx.body = allCompoentsUids;
    },
    async listCollections(ctx) {
      let collectionsContainingComponentData = [];

      if (ctx.params.componentUid){
        const componentName = ctx.params.componentUid;
        const componentsWithPopulate = await getContainingComponentsWithPopulateStructure(componentName);
        componentsWithPopulate.push({ [componentName] : {populate: '*'}});
        const listOfCollectionsWithPopulateObject = [];
        for (let k=0; k<componentsWithPopulate.length; k++) {
          const component = componentsWithPopulate[k];
          const [componentUid] = Object.keys(component);
          const data = await getCollectionsWithComponentsPopulate(componentUid, component);
          listOfCollectionsWithPopulateObject.push(...data);
        }
        for (let k=0; k<listOfCollectionsWithPopulateObject.length; k++) {
          const collectionObject = listOfCollectionsWithPopulateObject[k];
          const thisCollectionContainingComponentData = await getCollectionsHavingComponentData(collectionObject, componentName);
          collectionsContainingComponentData.push(...thisCollectionContainingComponentData);
        }
        ctx.body = deduplicateRowsByDocumentId(collectionsContainingComponentData);
      }      
    }
  });
  
  export default controller;
  