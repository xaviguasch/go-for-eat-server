'use strict';
const axios = require('axios');
const config = require('../config.js');
const filterProps = require('../services/utils').filterProps;

const monk = require('monk');
const db = monk(process.env.MONGOLAB_URI);

const Events = db.get('events');
const Users = db.get('users');

class UsersController {
  constructor (Users, Events, monk) {
    this.Users = this.Users;
    this.Events = Events;
    this.monk = monk;
  }

  async _userDB (userData) {
    // console.log('_userDB:', userData);
    let user = await this.Users.findOne({ email: userData.email });
    // console.log('findOne:', user);
    if (!user) {
      try {
        // console.log('new user');
        userData.ratings_number = userData.ratings_average = '0';
        userData.description = userData.profession = '';
        userData.interests = [];
        return this.Users.insert(userData);
        // eslint-disable-next-line no-console
      } catch (e) { console.error('this.Users.insert', e); }
    } else {
      try {
        await this.Users.update({ email: userData.email }, {
          $set: {
            'name': userData.name,
            'email': userData.email,
            'profile_picture': userData.profile_picture,
            'birthday': userData.birthday,
            'gender': userData.gender,
            'accessToken': userData.accessToken,
          }
        });
        // console.log('update user');
        return this.Users.findOne({ email: userData.email });
        // eslint-disable-next-line no-console
      } catch (e) { console.error('Update user error', e); }
    }
  }

  async auth (ctx, next) {
    if ('POST' != ctx.method) return await next();
    // console.log('auth', ctx.request.body);
    if (ctx.request.body.network == 'facebook') {
      try {
        let authResult = await axios.get(config.facebook.validateUrl + config.facebook.fields, {
          headers: {
            'Authorization': 'Bearer ' + ctx.request.body.accessToken,
          }
        });
        // console.log('authResult', authResult);
        if (authResult.data.id == ctx.request.body.id) {
        // const events = await Events.find({ attendees: this.monk.id('5a6f414bb3385f4c2576f837')});
        // const events = await Events.find({attendees: ctx.request.body.id});
        // const created_events = await Events.find({creator: ctx.request.body.id});
          let user = {
            'name': authResult.data.first_name,
            'email': authResult.data.email,
            'profile_picture': authResult.data.picture.data.url,
            'birthday': authResult.data.birthday,
            'gender': authResult.data.gender,
            'events': [],
            'created_events': [],
            'accessToken': 'FB' + ctx.request.body.accessToken,
          };
          user = await _userDB(user);
          // console.log('request.body', ctx.request.body)
          user.events = await this.Events.aggregate([
            { $match: { attendees: this.monk.id(user._id) } },
            {
              $lookup:
              {
                from: 'users',
                localField: 'attendees',
                foreignField: '_id',
                as: 'attendees'
              },
            },
            {
              $project: {
                'attendees.email': 0,
                'attendees.birthday': 0,
                'attendees.gender': 0,
                'attendees.events': 0,
                'attendees.created_events': 0,
                'attendees.accessToken': 0,
                'attendees.ratings_average': 0,
                'attendees.ratings_number': 0,
                'attendees.profession': 0,
                'attendees.description': 0,
                'attendees.interests': 0
              }
            }
          ]);

          user.created_events = await this.Events.aggregate([
            { $match: { creator: this.this.monk.id(user._id) } },
            {
              $lookup: {
                from: 'users',
                localField: 'attendees',
                foreignField: '_id',
                as: 'attendees'
              },
            },
            {
              $project: {
                'attendees.email': 0,
                'attendees.birthday': 0,
                'attendees.gender': 0,
                'attendees.events': 0,
                'attendees.created_events': 0,
                'attendees.accessToken': 0,
                'attendees.ratings_average': 0,
                'attendees.ratings_number': 0,
                'attendees.profession': 0,
                'attendees.description': 0,
                'attendees.interests': 0
              }
            }
          ]);
          // console.log('events', events)
          // console.log('user', user);
          if (user.email) {
            ctx.status = 200;
            ctx.body = JSON.stringify({ 'user': user });
            return;
          }
        }
      // eslint-disable-next-line no-console
      } catch (e) { console.error('Facebook validate error', e); }
    } else if (ctx.request.body.network == 'google') {
      // console.log('google ctx.request.body', ctx.request.body);
      try {
        let authResult = await axios.get(config.google.validateUrl + ctx.request.body.idToken, {
          headers: {
            'Authorization': 'Bearer ' + ctx.request.body.accessToken,
          }
        });
        // console.log('authResult', authResult.data);
        if (authResult.data.sub == ctx.request.body.id) {
          let { data } = await axios.get('https://people.googleapis.com/v1/people/me?personFields=birthdays',
            {
              headers: {
                'Authorization': `Bearer ${ctx.request.body.accessToken}`,
              }
            });
          const birthday = `${data.birthdays[1].date.month}\\${data.birthdays[1].date.day}\\${data.birthdays[1].date.year}`;
          let user = {
            'name': authResult.data.given_name,
            'email': authResult.data.email,
            'profile_picture': authResult.data.picture,
            'birthday': birthday,
            'gender': authResult.data.gender,
            'accessToken': 'GO' + ctx.request.body.accessToken,
          };
          // console.log('user', user);
          user = await _userDB(user);
          user.events = await this.Events.aggregate([
            { $match: { attendees: this.monk.id(user._id) } },
            {
              $lookup:
              {
                from: 'users',
                localField: 'attendees',
                foreignField: '_id',
                as: 'attendees'
              },
            },
            {
              $project: {
                'attendees.email': 0,
                'attendees.birthday': 0,
                'attendees.gender': 0,
                'attendees.events': 0,
                'attendees.created_events': 0,
                'attendees.accessToken': 0,
                'attendees.ratings_average': 0,
                'attendees.ratings_number': 0,
                'attendees.profession': 0,
                'attendees.description': 0,
                'attendees.interests': 0
              }
            }
          ]);

          user.created_events = await Events.aggregate([
            { $match: { creator: this.monk.id(user._id) } },
            {
              $lookup:
              {
                from: 'users',
                localField: 'attendees',
                foreignField: '_id',
                as: 'attendees'
              },
            },
            {
              $project: {
                'attendees.email': 0,
                'attendees.birthday': 0,
                'attendees.gender': 0,
                'attendees.events': 0,
                'attendees.created_events': 0,
                'attendees.accessToken': 0,
                'attendees.ratings_average': 0,
                'attendees.ratings_number': 0,
                'attendees.profession': 0,
                'attendees.description': 0,
                'attendees.interests': 0
              }
            }
          ]);

          if (user.email) {
          // console.log('google user', user);
            ctx.status = 200;
            ctx.body = JSON.stringify({ 'user': user });
            return;
          }
        }
      // eslint-disable-next-line no-console
      } catch (e) { console.error('Google validate error', e); }
    } if (ctx.request.body.network == 'linkedin') {
      // console.log('linkedin ctx.request.body', ctx.request.body);
    }
    ctx.status = 400;
  }

  async getUser (ctx, next) {
    if ('GET' != ctx.method) return await next();
    try {
      let user = await this.Users.findOne({ _id: ctx.params.id });
      user = filterProps(user, ['_id', 'name', 'profile_picture', 'gender', 'birthday', 'ratings_number', 'ratings_average', 'interests', 'description', 'profession']);
      ctx.status = 200;
      ctx.body = user;
    // eslint-disable-next-line no-console
    } catch (e) { console.error('Get user error', e); }
  }

  async me (ctx, next) {
    if ('GET' != ctx.method) return await next();
    ctx.status = 200;
    ctx.body = ctx.user;
  }

  async edit (ctx, next) {
    if ('PUT' != ctx.method) return await next();
    try {
      await this.Users.update({ _id: ctx.user._id }, ctx.request.body.edit);
    // the recived object should be like this:
    // ctx.request.body.edit =
    // {
    //   'interests': [tennis , video games, food],
    //   'description': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    //   'profession': 'Full stack developer'
    // }
    // eslint-disable-next-line no-console
    } catch (e) { console.error('Edit user error', e); }
    ctx.status = 204;
  }
}

module.exports = UsersController;