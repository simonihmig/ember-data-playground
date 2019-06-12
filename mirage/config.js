export default function() {

  // These comments are here to help you get started. Feel free to delete them.

  /*
    Config (with defaults).

    Note: these only affect routes defined *after* them!
  */

  // this.urlPrefix = '';    // make this `http://localhost:8080`, for example, if your API is on a different server
  // this.namespace = '';    // make this `/api`, for example, if your API is namespaced
  // this.timing = 400;      // delay for each request, automatically set to 0 during testing

  /*
    Shorthand cheatsheet:

    this.get('/posts');
    this.post('/posts');
    this.get('/posts/:id');
    this.put('/posts/:id'); // or this.patch
    this.del('/posts/:id');

    http://www.ember-cli-mirage.com/docs/v0.4.x/shorthands/
  */

  this.get('/companies');
  this.get('/companies/:id');
  this.post('/companies');
  this.patch('/companies/:id');

  // simulate the API doing a cascading delete ini Mirage!
  this.del('/companies/:id', ({ companies }, request) => {
    let id = request.params.id;
    let company = companies.find(id);

    company.departments.models.forEach(d => d.users.destroy());
    company.departments.destroy();
    company.destroy();
  });

  this.get('/departments');
  this.get('/departments/:id');
  this.post('/departments');
  this.patch('/departments/:id');
  this.del('/departments/:id');

  this.get('/users');
  this.get('/users/:id');
  this.post('/users');
  this.patch('/users/:id');
  this.del('/users/:id');
}
