window.OneSignal = window.OneSignal || [];
OneSignal.push(function() {
	OneSignal.init({
		appId: "cc3b9e22-8131-4b0c-850e-07120c5b7bc9",
	});
});

OneSignal.push(function() {
	OneSignal.getTags(function(tags) {
		console.log("current tags", tags);
	});
});

$("#tag").change(function() {
	const tagValue = $(this).val();
	if(!tagValue.length) return;
	
	OneSignal.push(function() {
		OneSignal.sendTag("match", tagValue).then(function(tagsSent) {
			console.log("set tag", tagsSent);
		}); 
	});
});