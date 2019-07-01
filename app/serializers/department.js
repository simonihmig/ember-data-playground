import ApplicationSerializer from './application';

export default class DepartmentSerializer extends ApplicationSerializer {
  attrs = {
    users: {
      serialize: 'records',
    },
  };
}
