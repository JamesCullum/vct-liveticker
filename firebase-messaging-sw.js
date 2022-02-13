importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

const firebaseConfig = {
    apiKey: "AIzaSyCThkB9-GPLM45G9aFQfHm0oerXCFxJbR4",
    authDomain: "notepad-96add.firebaseapp.com",
    projectId: "notepad-96add",
    storageBucket: "notepad-96add.appspot.com",
    messagingSenderId: "331171673427",
    appId: "1:331171673427:web:21e69817b766c2c0bd9da6"
};

const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();