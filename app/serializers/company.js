import ApplicationSerializer from './application';

export default class CompanySerializer extends ApplicationSerializer {
  attrs = {
    departments: {
      serialize: 'records',
    },
  };
}
