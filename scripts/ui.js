
const subscriberRef = db.collection("push_subscribers");
messaging.getToken({vapidKey: "BHsrbLQQiNSDUQzw6EgeO-45Arty5Pct9lDQWevJpsL2bzts_o0BZL7MmZt7lDcoFjd2mSumps5UByzBaboPCxU"}).then(currentToken => {
	console.log("token", currentToken);
	localStorage.setItem("fcm_token", currentToken);
	const ownSubRef = subscriberRef.doc(currentToken);
	
	// Check current subscriptions
	ownSubRef.get().then(querySnapshot => {
		if(!querySnapshot.exists) return console.log("doesnt exist yet");
		console.log("Subscriptions: ", querySnapshot.data());
	});
	
	// Add subscriptions
	$("#tag").change(function() {
		const tagValue = parseInt($(this).val());
		if(!tagValue) return;
		
		ownSubRef.set({
			"matches": [tagValue],
		}, { merge: true }).then(() => {
			console.log("Subscription added");
		}).catch((error) => {
			console.error("Error writing document: ", error);
		});
	});
});
