const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const should = chai.should();

const {DATABASE_URL} = require('../config');
const {BlogPost} = require('../models');
const {closeServer, runServer, app} = require('../server');

chai.use(chaiHttp);

function createTestBlogPosts() {
  console.info('add fake blog post data for tests');
  const testBlogPosts = [];
  for (var i=1; i<=10; i++) {
    testBlogPosts.push({
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      },
      title: faker.lorem.sentence(),
      content: faker.lorem.text()
    });
  }
  return BlogPost.insertMany(testBlogPosts);
}


describe('blog API', function() {

  before(function() {
    return runServer(DATABASE_URL);
  });

  beforeEach(function() {
    return createTestBlogPosts();
  });

  after(function() {
    return closeServer();
  });


  describe('GET endpoint', function() {
    it('should return all existing blog posts from the database', function() {
   let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          res.should.have.status(200);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          res.body.should.have.length.of(count);
        });
    });    

    it('should return the blog posts with required fields', function() {
      let resBlogPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.length.of.at.least(1);
          res.body.forEach(function(blogPost) {
            blogPost.should.be.a('object');
            blogPost.should.include.keys('id', 'title', 'content', 'author');
          });
          resBlogPost = res.body[0];
          return BlogPost.findById(resBlogPost.id).exec();
        })
        .then(blogPost => {
          resBlogPost.title.should.equal(blogPost.title);
          resBlogPost.content.should.equal(blogPost.content);
          resBlogPost.author.should.equal(blogPost.authorName);
        });
    });
  });


  describe('POST endpoint', function() {
    it('should add a new blog post to the database', function() {

      const newBlogPost = {
          title: faker.lorem.sentence(),
          author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
          },
          content: faker.lorem.text()
      };

      return chai.request(app)
        .post('/posts')
        .send(newBlogPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'id', 'title', 'content', 'author', 'created');
          res.body.title.should.equal(newBlogPost.title);
          res.body.id.should.not.be.null;
          res.body.author.should.equal(
            `${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`);
          res.body.content.should.equal(newBlogPost.content);
          return BlogPost.findById(res.body.id).exec();
        })
        .then(function(blogPost) {
          blogPost.title.should.equal(newBlogPost.title);
          blogPost.content.should.equal(newBlogPost.content);
          blogPost.author.firstName.should.equal(newBlogPost.author.firstName);
          blogPost.author.lastName.should.equal(newBlogPost.author.lastName);
        });
    });
  });

  describe('PUT endpoint', function() {
    it('should update blog post fields', function() {
      const updateBlogPost = {
        title: 'My name is Alexander Hamilton',
        content: 'I am a founding father',
        author: {
          firstName: 'Alexander',
          lastName: 'Hamilton'
        }
      };

      return BlogPost
        .findOne()
        .exec()
        .then(blogPost => {
          updateBlogPost.id = blogPost.id;

          return chai.request(app)
            .put(`/posts/${blogPost.id}`)
            .send(updateBlogPost);
        })
        .then(res => {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.title.should.equal(updateBlogPost.title);
          res.body.author.should.equal(
            `${updateBlogPost.author.firstName} ${updateBlogPost.author.lastName}`);
          res.body.content.should.equal(updateBlogPost.content);

          return BlogPost.findById(res.body.id).exec();
        })
        .then(blogPost => {
          blogPost.title.should.equal(updateBlogPost.title);
          blogPost.content.should.equal(updateBlogPost.content);
          blogPost.author.firstName.should.equal(updateBlogPost.author.firstName);
          blogPost.author.lastName.should.equal(updateBlogPost.author.lastName);
        });
    });
  });

  describe('DELETE endpoint', function() {
    it('should find blog post by id and then delete', function() {

      let post;
      return BlogPost
        .findOne()
        .exec()
        .then(_post => {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(res => {
          res.should.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(_post => {
          should.not.exist(_post);
        });
    });
  });
});


