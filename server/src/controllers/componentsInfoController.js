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
            console.log(component);
            //Step 1 : Get all components and collections
            const allComponents = strapi.plugin('content-manager').service('components').findAllComponents();
            const allCollections =  strapi.plugin('content-manager').service('content-types').findAllContentTypes();
        
            //Step 2 : Check if the component exists in all components list
            const isComponentPresent = allComponents.filter((comp) => comp.uid === component);
            if (isComponentPresent.length > 0) {
              const componentToLookFor = isComponentPresent[0];
              console.log(componentToLookFor);
              //Step 3 : Lets go through all components to see which have this component in their definition
              for (let k=0; k<allCollections.length; k++) {
                const selectedCollection = allCollections[k]; 
                const selCollAttributes = selectedCollection.attributes;
                const selCollAttributesList = Object.keys(selCollAttributes);
                for (let r=0; r<selCollAttributesList.length; r++) {
                  const attribute =selCollAttributesList[r];
                  if (selCollAttributes[attribute].type === 'dynamiczone') {
                    const dynCompList = selCollAttributes[attribute]['components'];
                    console.log(dynCompList);
                    if (dynCompList.includes(componentToLookFor.uid)) {
                      console.log(selectedCollection.uid);
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
                    console.log(selectedCollection.uid);
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
              console.log(collectionsContainingComponentDefinition);
              //Step 4 : Get all collections that contain the data for this component.
              for (let s=0; s<collectionsContainingComponentDefinition.length; s++) {
                const curCollection = collectionsContainingComponentDefinition[s];
                const allItems = await strapi.documents(curCollection.uid).findMany({
                  populate: [curCollection.matchingAttributeName]
                });
                for (let r=0; r<allItems.length; r++) {
                  const item = allItems[r];
                  if (curCollection.matchType === 'dynamiczone') {
                    for (let i=0; i<item[curCollection.matchingAttributeName].length; i++) {
                      const dynamicZoneItem = item[curCollection.matchingAttributeName][i];
                      if (dynamicZoneItem['__component'] === componentToLookFor.uid) {
                        collectionsContainingComponentData.push({
                          'uid' : curCollection.uid,
                          'data' : item
                        });
                        break;
                      }
                    }
                  }
                  else if (curCollection.matchType === 'component') {
                    if (Object.keys(item).includes(curCollection.matchingAttributeName) &&
                      item[curCollection.matchingAttributeName]) {
                        collectionsContainingComponentData.push({
                          'uid' : curCollection.uid,
                          'data' : item
                        });
                      }
                  }        
               }
              }
              console.log(collectionsContainingComponentData);
              console.log(collectionsContainingComponentData.length);
            }
        }
        ctx.body = collectionsContainingComponentData;
    }
  });
  
  export default controller;
  