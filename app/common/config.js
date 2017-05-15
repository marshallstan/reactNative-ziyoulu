'use strict';

module.exports = {
  header: {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  },
  backup: {
    avatar: 'http://opkzfsedc.bkt.clouddn.com/eminem.jpg'
  },
  qiniu: {
    upload: 'http://upload.qiniu.com',
    avatar: 'http://opfly0yns.bkt.clouddn.com/',
    thumb: 'http://opj16u3r1.bkt.clouddn.com/',
    video: 'http://opj16u3r1.bkt.clouddn.com/'
  },
  cloudinary: {
    cloud_name: 'marshallstan',
    api_key: '857133951672155',
    base: 'http://res.cloudinary.com/marshallstan',
    image: 'https://api.cloudinary.com/v1_1/marshallstan/image/upload',
    video: 'https://api.cloudinary.com/v1_1/marshallstan/video/upload',
    audio: 'https://api.cloudinary.com/v1_1/marshallstan/raw/upload'
  },
  api: {
    // base: "http://rapapi.org/mockjs/18152/",
    // base: "http://marshall.ngrok.cc/",
    base: "http://app.marshallstan.club/",
    creations: "api/creations",
    up: "api/up",
    video: 'api/creations/video',
    audio: 'api/creations/audio',
    comment: "api/comments",
    signup: "api/u/signup",
    verify: "api/u/verify",
    update: "api/u/update",
    signature: "api/signature"
  }
};