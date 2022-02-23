
db.collection("events").doc("current").onSnapshot(doc => {
	const events = Object.entries(doc.data());
	$("#event-list").html("")
	
	if(!events.length) {
		return $("#event-list").append(`<div class="alert alert-primary alert-downtime">
			<h3>There appears to be some downtime!</h3>
			<p>Check <a href="https://www.vlr.gg/" target="_blank" rel="noopener noreferrer">vlr.gg</a> to see if it's Riots schedule or our servers.</p>
		</div>`)
	}
	
	events.sort(([aName, aVal], [bName, bVal]) => {
		return bName < aName;
	})
	
	for (let [name, matchInventory] of events) {
		if(name == "_updated") continue
		
		const thisEventItem = $("#template-elements > .event-item").clone()
		$(".event-container", thisEventItem).attr("data-subscription-type", "events").attr("data-subscription-label", name)
		$(".event-name", thisEventItem).text(name)
		
		const matchDataList = []
		if(1 in matchInventory) matchDataList.push(...matchInventory[1])
			
		const notLiveEvents = []
		if(2 in matchInventory) notLiveEvents.push(...matchInventory[2])
		if(0 in matchInventory) notLiveEvents.push(...matchInventory[0])
		
		const now = new Date()
		notLiveEvents.sort((a, b) => {
			const aDateDiff = Math.abs(now - a.date.toDate())
			const bDateDiff = Math.abs(now - b.date.toDate())
			return aDateDiff > bDateDiff
		})
		matchDataList.push(...notLiveEvents)
		
		// debugging
		/*while(matchDataList.length > 0 && matchDataList.length < 6) {
			matchDataList.push(...matchDataList)
		}*/
		
		for (let matchData of matchDataList) {		
			const thisMatchItem = getMatchItem(matchData)
			thisEventItem.append(thisMatchItem)
		}
		
		$("#event-list").append(thisEventItem)
	}
	
	sortBySubscription("#event-list", ".event-item")
	sortBySubscription(".event-item", ".match-item", () => {
		limitExpandItems(".event-item", ".match-item", 3)
	})
	
})

