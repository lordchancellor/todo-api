const { ObjectID } = require('mongodb');
const jwt = require('jsonwebtoken');

const { Todo } = require('./../../models/todo');
const { User } = require('./../../models/user');

const secret = 'secretsauce';
const userOneId = new ObjectID();
const userTwoId = new ObjectID();

const users = [
	{ 
		_id: userOneId, 
		email: 'dave@dave.com', 
		password: 'userOnePassword',
		tokens: [
			{ 
				access: 'auth', 
				token: jwt.sign({ _id: userOneId, access: 'auth' }, secret).toString() 
			}
		]
	},
	{
		_id: userTwoId,
		email: 'thing@thing.com',
		password: 'userTwoPassword'
	}
];

const todos = [
	{ _id: new ObjectID(), text: 'Write test suite' },
	{ _id: new ObjectID(), text: 'Feed the cat', completed: true, completedAt: new Date().getTime() }
];

const populateTodos = (done) => {
	Todo.remove({})
			.then(() => {
				return Todo.insertMany(todos);
			})
			.then(() => done());
};

const populateUsers = (done) => {
	User.remove({})
			.then(() => {
				const userOne = new User(users[0]).save();
				const userTwo = new User(users[1]).save();

				return Promise.all([userOne, userTwo]);
			})
			.then(() => done());
}

module.exports = { todos, populateTodos, users, populateUsers };