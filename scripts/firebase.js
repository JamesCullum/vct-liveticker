const firebaseConfig = {
	apiKey: "AIzaSyCThkB9-GPLM45G9aFQfHm0oerXCFxJbR4",
	authDomain: "notepad-96add.firebaseapp.com",
	projectId: "notepad-96add",
	storageBucket: "notepad-96add.appspot.com",
	messagingSenderId: "331171673427",
	appId: "1:331171673427:web:21e69817b766c2c0bd9da6"
};

const app = firebase.initializeApp(firebaseConfig);

const appCheck = firebase.appCheck();
appCheck.activate('6LeIsXYeAAAAAObgcWGuMGqLdNvp86fVIrlhcg1x', true);

const messaging = firebase.messaging();
messaging.onMessage(payload => {
	console.log("Message received. ", payload);
});

const db = firebase.firestore();
db.collection("matches").where("status", "==", 1).orderBy(firebase.firestore.FieldPath.documentId()).limit(50).get().then(querySnapshot => {
	querySnapshot.forEach(doc => {
		const matchData = doc.data();
		
		let option = document.createElement('option');
		option.value = doc.id;
		option.innerText = matchData.team1 + ' vs '+matchData.team2+': ' + matchData.event;
		$("#tag").append(option);
	});
	$("#tag").removeAttr("disabled").find("option:first").text("Select match");
});
