import EmberRouter from '@ember/routing/router';
import config from './config/environment';

const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('company', function() {
    this.route('edit', { path: 'edit/:company_id' });
  });
  this.route('user', function() {
    this.route('edit', { path: 'edit/:user_id' });
  });
});

export default Router;
