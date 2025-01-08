export default [
  {
    method: 'GET',
    path: '/list-components',
    handler: 'componentsInfoController.listComponents',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/get-containing-collections/:componentUid',
    handler: 'componentsInfoController.listCollections',
    config: {
      policies: [],
    },
  }
];
