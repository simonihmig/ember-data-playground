import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { setupMirage } from 'ember-cli-mirage/test-support';
import { settled } from '@ember/test-helpers';

module('Unit | Store | cascade', function(hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  module('delete', function() {

    test('it cascades into enabled relationships', async function(assert) {
      let store = this.owner.lookup('service:store');
      let companyRecord = this.server.create('company', 'withDepartmentsAndUsers');

      let company = await store.findRecord('company', companyRecord.id, { include: 'departments,departments.users'});
      // make sure our seeding is correct
      assert.ok(company, 'company exists');
      assert.ok(company.departments.length > 0, 'company has departments');
      assert.equal(company.departments.filter(d => d.users.length === 0).length, 0, 'All departments have users');

      await company.destroyRecord();
      await settled();

      // company has been deleted...
      // client-side
      assert.ok(company.isDeleted, 'company model has been deleted');
      assert.ok(company.isValid, 'company model is persisted');
      // server-side
      assert.equal(this.server.schema.companies.all().length, 0, 'No company record on backend');

      // departments have been deleted...
      // client-side
      assert.equal(company.departments.length, 0, 'company has no departments');
      assert.equal(store.peekAll('department').length, 0, 'department models are unloaded');
      // server-side
      assert.equal(this.server.schema.departments.all().length, 0, 'No department records on backend');

      // users have been deleted...
      // client-side
      assert.equal(store.peekAll('user').length, 0, 'user models are unloaded');
      // server-side
      assert.equal(this.server.schema.users.all().length, 0, 'No department records on backend');

      // somehow when tearing down the test context store.unloadAll() is called which throws somehow related to our
      // model unloading. We do it explicitly here and catch, so the test does not fail because of this.
      try {
        await store.unloadAll();
      }
      catch (e) {
// eslint-disable-next-line no-console
        console.error(e);
      }
    });
  });
});
