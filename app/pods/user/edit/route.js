import Route from '@ember/routing/route';

export default class UserEditRoute extends Route {
  model({ user_id }) {
    return this.store.findRecord('user', user_id);
  }
}
