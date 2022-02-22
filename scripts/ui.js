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
		<button type="button" class="btn btn-light enable-notifications">Start receiving updates</button>
	</div>`)
	
	$("#disabled-notification-hint").click(function(evt) {
		localStorage.setItem("disabled-notification-hint", "1")
	})
}
$(".sign-in").click(async function(evt) {
	evt.preventDefault()
	await initNotificationProfile()
})
$("body").on("click", ".enable-notifications", function(evt) {
	evt.preventDefault()
	Notification.requestPermission(async function (permission) {
		if (permission === "granted") await initNotificationProfile()
	});
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
	syncNewSubscriptions().then(() => {
		console.log("updated subscription", subscription)
	})
	
	subscriptionUpdateUI()
})

async function initNotificationProfile() {
	try {
		msgToken = await messaging.getToken({vapidKey: "BHsrbLQQiNSDUQzw6EgeO-45Arty5Pct9lDQWevJpsL2bzts_o0BZL7MmZt7lDcoFjd2mSumps5UByzBaboPCxU"})
	} catch(error) {
		console.error(error)
		alert("Connection to Firebase Cloud Messaging has failed. Any adblockers that might block such connection? Please check the console for details.")
	}
	ownSubRef = db.collection("push_subscribers").doc(msgToken)
	console.log("token", msgToken)
	
	$("#notification-start-hint").remove()
	$("#menu-profile").html(`<a class="nav-link" href="/subscriptions">Manage Subscriptions</a>`)
	
	// Check current subscriptions
	const querySnapshot = await ownSubRef.get()
	if(!querySnapshot.exists) {
		console.log("doesnt exist yet");
		delete subscription.mocked
		return false
	}
	subscription = querySnapshot.data()
	subscription._updated = subscription._updated.toDate()
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

function subscriptionUpdateUIWait(resolve, reject, i) {
	if(typeof reject != 'function') reject = (str) => console.error(str)
	if(Notification.permission != "granted" && typeof i == 'undefined') return reject("No permission")
	
	if(typeof i == 'undefined') i = 5
	if(i !== false && i <= 0) return reject("Timeout on subscriptionUpdateUIWait")
	
	if("mocked" in subscription) {
		return setTimeout(() => {
			subscriptionUpdateUIWait(resolve, reject, i !== false ? i-1 : false)
		}, 500)
	}
	
	subscriptionUpdateUI()
	resolve()
}

function sortBySubscription(containerSelector, childSelector, func) {
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
		
		if(typeof func == 'function') func()
	})
}

// Collapsible for mobile
function limitExpandItems(containerSelector, childSelector, expandBreakpoint) {
	$(containerSelector).each(function() {
		const eventItem = $(this)
		
		let i = 0
		const childs = $(childSelector, eventItem)
		if(childs.length <= expandBreakpoint) return false
		
		childs.each(function() {
			i++
			
			if(i == expandBreakpoint) {
				eventItem.append(`<div class="col-12 d-block d-sm-none expand-items" data-breakpoint="`+expandBreakpoint+`">
					<div class="d-grid gap-2">
						<button class="btn btn-lg btn-primary" type="button">See more</button>
					</div>
				</div>`)
			} else if(i > expandBreakpoint) {
				$(this).addClass("d-none d-sm-block")
			}
		})
	})
}
$("body").on("click", ".expand-items", function(evt) {
	const container = $(this).closest(".expand-container")
	const expandBreakpoint = parseInt($(this).attr("data-breakpoint"))
	const childs = container.find("> .d-none:not(.expand-items)")
	const hasMore = childs.length > expandBreakpoint
	
	$(childs.slice(0, expandBreakpoint)).each(function() {
		$(this).removeClass("d-none d-sm-block")
	})
	
	if(!hasMore) $(this).remove()
})

function getMatchItem(matchData) {
	const thisMatchItem = $("#template-elements > .match-item").clone()
	
	//$(".card", thisMatchItem).addClass("bg-"+statusCardClassLookup[matchData.status])
	thisMatchItem.addClass("match-status-" + matchData.status)
		.attr("data-subscription-type", "matches").attr("data-subscription-label", matchData.id)
	
	const date = matchData.date.toDate()
	$(".card-header .left-info", thisMatchItem).html(matchData.stage + "<br>" + date.toLocaleString())
	
	let timeDiff = get_time_diff(date)
	if(matchData.status == 1) timeDiff = '<i class="fa-solid fa-circle"></i>'
	else if(matchData.status == 2) timeDiff = timeDiff + " AGO"
	else timeDiff = "IN " + timeDiff
	$(".card-header .right-info", thisMatchItem).html(statusLookup[matchData.status].toUpperCase() + "<br>" + timeDiff)
	
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

function syncNewSubscriptions() {
	subscription._updated = new Date()
	subscription._synced = false
	
	return ownSubRef.set(subscription)
}

// https://stackoverflow.com/a/5767357/1424378
function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

// https://stackoverflow.com/a/18103175/1424378
function get_time_diff( datetime )
{
    var datetime = new Date( datetime ).getTime();
    var now = new Date().getTime();

    if( isNaN(datetime) ) return "";

    if (datetime < now) {
        var milisec_diff = now - datetime;
    }else{
        var milisec_diff = datetime - now;
    }

    var days = Math.floor(milisec_diff / 1000 / 60 / (60 * 24));
    var date_diff = new Date(milisec_diff);

	let finalStr = ""
	if(days > 0) return days + " DAYS"
	if(date_diff.getHours() > 0) finalStr += date_diff.getHours() + "H "
	if(date_diff.getMinutes() > 0) finalStr += date_diff.getMinutes() + "M "
	if(date_diff.getHours() == 0 && date_diff.getSeconds() > 0) finalStr += date_diff.getSeconds() + "S "
    return finalStr
}