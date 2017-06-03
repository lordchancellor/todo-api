const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

const UserSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		minlength: 1,
		trim: true,
		unique: true,
		validate: {
			validator: validator.isEmail,
			message: `{VALUE} is not a valid email`
		}
	},
	password: {
		type: String,
		require: true,
		minlength: 6
	},
	tokens: [{
		access: {
			type: String,
			required: true
		},
		token: {
			type: String,
			required: true
		}
	}]
});

UserSchema.methods.toJSON = function toJSON() {
	const user = this;
	const userObject = user.toObject();

	return _.pick(userObject, ['_id', 'email']);
};

UserSchema.methods.generateAuthToken = function generateAuthToken() {
	const user = this;
	const access = 'auth';
	const token = jwt.sign({ _id: this._id.toHexString(), access}, 'jorgesecretsauce').toString();

	user.tokens.push({ access, token });

	return user.save()
						 .then(() => token);
};

UserSchema.statics.findByToken = function findByToken(token) {
	const User = this;
	let decoded;

	try {
		decoded = jwt.verify(token, 'jorgesecretsauce');
	} catch (e) {
		return Promise.reject();
	}

	return User.findOne({
		'_id': decoded._id,
		'tokens.token': token,
		'tokens.access': 'auth'
	});
};

const User = mongoose.model('User', UserSchema);

module.exports = { User };