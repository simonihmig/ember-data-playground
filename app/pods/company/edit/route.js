import Route from '@ember/routing/route';

export default class CompanyEditRoute extends Route {
  model({ company_id }) {
    return this.store.findRecord('company', company_id, { include: 'departments,departments.users'});
  }
}
