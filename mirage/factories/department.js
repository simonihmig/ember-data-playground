import { Factory, trait } from 'ember-cli-mirage';
import faker from 'faker';

export default Factory.extend({
  name: faker.commerce.department,

  withUsers: trait({
    afterCreate(department, server) {
      server.createList('user', 5, { department });
    }
  }),
});
