import { Factory, trait } from 'ember-cli-mirage';
import faker from 'faker';

export default Factory.extend({
  name() {
    return faker.company.companyName(0);
  },

  withDepartments: trait({
    afterCreate(company, server) {
      server.createList('department', 2, { company });
    }
  }),

  withDepartmentsAndUsers: trait({
    afterCreate(company, server) {
      server.createList('department', 5, { company }, 'withUsers');
    }
  })
});
