console.log("path", window.location.pathname)

const pageScript = document.createElement('script')
pageScript.async = true


let scriptName = "events"
if((match = /^\/(\w*)/.exec(window.location.pathname)) !== null) {
	if(["events", "matches", "subscriptions"].includes(match[1])) scriptName = match[1]
}
pageScript.src = "/scripts/page-" + scriptName + ".js"
document.head.appendChild(pageScript)

// Profile
if (Notification.permission == "granted") {
	initNotificationProfile().then(() => {})
} else if(!localStorage.getItem("disabled-notification-hint")) {
	$("body > .container").prepend(`<div class="alert alert-dismissible alert-info mb-4" id="notification-start-hint">
		<button type="button" class="btn-close" data-bs-dismiss="alert" id="disabled-notification-hint"></button>
		If you want to receive push notifications or live updates, please enable notifications.<br>
		<button type="button" class="btn btn-light" id="enable-notifications">Start receiving updates</button>
	</div>`)
	
	$("#disabled-notification-hint").click(function(evt) {
		localStorage.setItem("disabled-notification-hint", "1")
	})
	
	$("#enable-notifications").click(function(evt) {
		evt.preventDefault()
		Notification.requestPermission(async function (permission) {
			if (permission === "granted") await initNotificationProfile()
		});
	})
}
$(".sign-in").click(async function(evt) {
	evt.preventDefault()
	await initNotificationProfile()
})

// Notification & Subscription
window.msgToken = false
window.subscription = {events: [], matches: [], mocked: true}
window.ownSubRef = false
$("body").on("click", ".notification-subscribe, .notification-unsubscribe", async function(evt) {
	if(!msgToken) {
		await initNotificationProfile() // test if this works if we just wait
	}
	
	const notifWrapper = $(this).closest("[data-subscription-type][data-subscription-label]")
	const category = notifWrapper.attr("data-subscription-type")
	let label = notifWrapper.attr("data-subscription-label")
	
	if(category == "matches") label = parseInt(label)
	console.log("un/subscribe", category, label)
	
	if(!(category in subscription)) subscription[category] = []
	
	if(subscription[category].includes(label)) {
		// Unsub
		subscription[category] = removeItemOnce(subscription[category], label)
	} else {
		// Sub
		subscription[category].push(label)
	}
	subscription._updated = new Date()
	subscription._synced = false
	
	ownSubRef.set(subscription).then(() => {
		console.log("updated subscription", subscription)
	})
	subscriptionUpdateUI()
})

async function initNotificationProfile() {
	msgToken = await messaging.getToken({vapidKey: "BHsrbLQQiNSDUQzw6EgeO-45Arty5Pct9lDQWevJpsL2bzts_o0BZL7MmZt7lDcoFjd2mSumps5UByzBaboPCxU"})
	ownSubRef = db.collection("push_subscribers").doc(msgToken)
	console.log("token", msgToken)
	
	$("#notification-start-hint").remove()
	$("#menu-profile").html(`<a class="nav-link" href="/subscriptions">Manage Subscriptions</a>`)
	
	// Check current subscriptions
	const querySnapshot = await ownSubRef.get()
	if(!querySnapshot.exists) {
		console.log("doesnt exist yet");
		return false
	}
	subscription = querySnapshot.data()
	console.log("Subscriptions: ", subscription)
	
	subscriptionUpdateUI()
}

function subscriptionUpdateUI() {
	if("mocked" in subscription) return false
	
	$(".notification-subscribe").removeClass("d-none")
	$(".notification-unsubscribe").addClass("d-none")
	
	let modified = false
	for(const [category, labelList] of Object.entries(subscription)) {
		if(!Array.isArray(labelList)) continue
		
		for(const subLabel of labelList) {
			const picker = $('*[data-subscription-type="'+category+'"][data-subscription-label="'+subLabel+'"]')
			//console.log("picker", '*[data-subscription-type="'+category+'"][data-subscription-label="'+subLabel+'"]', picker)
			if(!picker.length) continue
			
			modified = true
			$(".notification-subscribe", picker).addClass("d-none")
			$(".notification-unsubscribe", picker).removeClass("d-none")
		}
	}
	
	return modified
}

function subscriptionUpdateUIWait(func, i) {
	if(Notification.permission != "granted") return false
	
	if(typeof i == 'undefined') i = 5
	if(i <= 0) return console.error("Timeout on subscriptionUpdateUIWait")
	
	if("mocked" in subscription) {
		return setTimeout(() => {
			subscriptionUpdateUIWait(func, i-1)
		}, 500)
	}
	
	subscriptionUpdateUI()
	func()
}

function sortBySubscription(containerSelector, childSelector) {
	subscriptionUpdateUIWait(() => {
		$(containerSelector).each(function() {
			const childs = $(this).children(childSelector).sort((a, b) => {
				const aIsSubbed = $(".notification-unsubscribe", a).is(':visible')
				const bIsSubbed = $(".notification-unsubscribe", b).is(':visible')
				
				if(aIsSubbed != bIsSubbed) {
					return aIsSubbed ? -1 : 1
				} else {
					return b.textContent < a.textContent
				}
			})
			$(this).append(childs)
		})
		
		subscriptionUpdateUI()
	})
}

function getMatchItem(matchData) {
	const thisMatchItem = $("#template-elements > .match-item").clone()
	
	//$(".card", thisMatchItem).addClass("bg-"+statusCardClassLookup[matchData.status])
	thisMatchItem.addClass("match-status-" + matchData.status)
		.attr("data-subscription-type", "matches").attr("data-subscription-label", matchData.id)
	
	$(".card-header .left-info", thisMatchItem).html(matchData.stage + "<br>" + matchData.time)
	if(matchData.status == 1) matchData.timeDiff = '<i class="fa-solid fa-circle"></i>'
	else if(matchData.status == 2) matchData.timeDiff = matchData.timeDiff.toUpperCase()+" AGO"
	else matchData.timeDiff = "IN "+matchData.timeDiff.toUpperCase()
	$(".card-header .right-info", thisMatchItem).html(statusLookup[matchData.status].toUpperCase() + "<br>" + matchData.timeDiff)
	
	$('.team-side[data-team=0] .team-name', thisMatchItem).text(matchData.team1)
	let score1 = "map1" in matchData ? matchData.map1 : "-"
	if("round1" in matchData) score1 += " (" + matchData.round1 + ")"
	$('.team-side[data-team=0] .team-score', thisMatchItem).text(score1)
	
	$('.team-side[data-team=1] .team-name', thisMatchItem).text(matchData.team2)
	let score2 = "map2" in matchData ? matchData.map2 : "-"
	if("round2" in matchData) score2 += " (" + matchData.round2 + ")"
	$('.team-side[data-team=1] .team-score', thisMatchItem).text(score2)
	
	return thisMatchItem
}

// https://stackoverflow.com/a/5767357/1424378
function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}