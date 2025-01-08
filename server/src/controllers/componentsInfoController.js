const controller = ({ strapi }) => ({
    listComponents(ctx) {
        const allComponents = strapi.plugin('content-manager').service('components').findAllComponents();
        const allCompoentsUids = allComponents.map((component) => component.uid);
        ctx.body = allCompoentsUids;
    },
    async listCollections(ctx) {
        let collectionsContainingComponentDefinition = [];
        let collectionsContainingComponentData = [];

        if (ctx.params.componentUid){
            const component = ctx.params.componentUid;
            //Step 1 : Get all components and collections
            const allComponents = strapi.plugin('content-manager').service('components').findAllComponents();
            const allCollections =  strapi.plugin('content-manager').service('content-types').findAllContentTypes();
        
            //Step 2 : Check if the component exists in all components list
            const isComponentPresent = allComponents.filter((comp) => comp.uid === component);
            if (isComponentPresent.length > 0) {
              const componentToLookFor = isComponentPresent[0];
              //Step 3 : Lets go through all components to see which have this component in their definition
              for (let k=0; k<allCollections.length; k++) {
                const selectedCollection = allCollections[k]; 
                const selCollAttributes = selectedCollection.attributes;
                const selCollAttributesList = Object.keys(selCollAttributes);
                for (let r=0; r<selCollAttributesList.length; r++) {
                  const attribute =selCollAttributesList[r];
                  if (selCollAttributes[attribute].type === 'dynamiczone') {
                    const dynCompList = selCollAttributes[attribute]['components'];
                    if (dynCompList.includes(componentToLookFor.uid)) {
                      collectionsContainingComponentDefinition.push({
                        uid: selectedCollection.uid,
                        definition : selectedCollection,
                        matchingAttributeName: attribute,
                        matchType: 'dynamiczone'
                      });
                      break;
                    }
                  }
                  else if (selCollAttributes[attribute].type === 'component' && selCollAttributes[attribute].component === componentToLookFor.uid) {
                    collectionsContainingComponentDefinition.push({
                      uid: selectedCollection.uid,
                      definition : selectedCollection,
                      matchingAttributeName: attribute,
                      matchType: 'component'
                    });
                    break;
                  }
                }
              }
              const locales = await strapi.plugin('i18n').service('locales').find();
              const localeCodes = locales.map(l => l.code);
              //Step 4 : Get all collections that contain the data for this component.
              for (let s=0; s<collectionsContainingComponentDefinition.length; s++) {
                const curCollection = collectionsContainingComponentDefinition[s];
                for (let w=0; w< localeCodes.length; w++) {
                  const allItems = await strapi.documents(curCollection.uid).findMany({
                    populate: [curCollection.matchingAttributeName],
                    locale: localeCodes[w]
                  });
                  for (let r=0; r<allItems.length; r++) {
                    const item = allItems[r];
                    if (curCollection.matchType === 'dynamiczone') {
                      for (let i=0; i<item[curCollection.matchingAttributeName].length; i++) {
                        const dynamicZoneItem = item[curCollection.matchingAttributeName][i];
                        if (dynamicZoneItem['__component'] === componentToLookFor.uid) {
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
                        item[curCollection.matchingAttributeName]) {
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
              }
            }
        }
        ctx.body = collectionsContainingComponentData;
    }
  });
  
  export default controller;
  