import Route from '@ember/routing/route';

export default class CompanyIndexRoute extends Route {
  model() {
    return this.store.findAll('company', { include: 'departments,departments.users'});
  }
}
