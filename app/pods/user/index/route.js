import Route from '@ember/routing/route';

export default class UsersIndexRoute extends Route {
  model() {
    return this.store.findAll('user', { include: 'department,department.company'});
  }
}
