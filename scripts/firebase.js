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
const statusLookup = {0: "Upcoming", 1: "Live", 2: "Finished"}
const statusCardClassLookup = {0: "secondary", 1: "danger", 2: "success"}
db.collection("events").doc("current").get().then(doc => {
	const events = Object.entries(doc.data());
	events.sort(([aName, aVal], [bName, bVal]) => {
		return bName < aName;
	})
	
	for (let [name, matchInventory] of events) {
		if(name == "_updated") continue
		
		const thisEventItem = $("#template-elements > .event-item").clone()
		$(".event-name", thisEventItem).text(name)
		
		const matchDataList = []
		if(1 in matchInventory) matchDataList.push(...matchInventory[1])
		if(0 in matchInventory) matchDataList.push(...matchInventory[0])
		if(2 in matchInventory) matchDataList.push(...matchInventory[2])
		
		for (let matchData of matchDataList) {
			const thisMatchItem = $("#template-elements > .match-item").clone()
			
			//$(".card", thisMatchItem).addClass("bg-"+statusCardClassLookup[matchData.status])
			thisMatchItem.addClass("match-status-" + matchData.status)
			
			$(".card-header .left-info", thisMatchItem).html(matchData.stage + "<br>" + matchData.time)
			if(matchData.status == 1) matchData.timeDiff = '<i class="fa-solid fa-circle"></i>'
			else if(matchData.status == 2) matchData.timeDiff = matchData.timeDiff.toUpperCase()+" AGO"
			else matchData.timeDiff = "IN "+matchData.timeDiff.toUpperCase()
			$(".card-header .right-info", thisMatchItem).html(statusLookup[matchData.status].toUpperCase() + "<br>" + matchData.timeDiff)
			$(".card-header .right-info", thisMatchItem).attr("title", matchData.time)
			
			$('.team-side[data-team=0] .team-name', thisMatchItem).text(matchData.team1)
			let score1 = "map1" in matchData ? matchData.map1 : "-"
			if("round1" in matchData) score1 += " (" + matchData.round1 + ")"
			$('.team-side[data-team=0] .team-score', thisMatchItem).text(score1)
			
			$('.team-side[data-team=1] .team-name', thisMatchItem).text(matchData.team2)
			let score2 = "map2" in matchData ? matchData.map2 : "-"
			if("round2" in matchData) score2 += " (" + matchData.round2 + ")"
			$('.team-side[data-team=1] .team-score', thisMatchItem).text(score2)			
			
			thisEventItem.append(thisMatchItem)
		}
		
		$("#event-list").append(thisEventItem)
	}
})

/*
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
*/