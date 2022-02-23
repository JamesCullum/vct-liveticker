
if(Notification.permission != "granted") {
	if(!$("#notification-start-hint").length) {
		$("body > .container").append(`<div class="alert alert-danger mb-4">
			Subscriptions are tied to the notification profile of your browser.
			Currently you have denied notification permission, which means we cannot identify your browser.<br>
			<button type="button" class="btn btn-light enable-notifications">Sign In</button>
		</div>`)
	}
}

subscriptionUpdateUIWait(() => {
	$("#loader").remove()
	
	$("body > .container").append(`
		<form id="subscription-form">
			<fieldset>
				<legend>Manage Subscription</legend>
				<div class="form-group row">
					<p class="col-4 col-sm-2">Last Updated</label>
					<div class="col-8 col-sm-10 text-right">
						<p id="sub-updated">Never</p>
					</div>
				</div>
				<div class="form-group row">
					<p class="col-4 col-sm-2">Synchronized</label>
					<div class="col-8 col-sm-10 text-right">
						<p id="sub-synced">Yes</p>
					</div>
				</div>
				<div class="form-group">
                    <label for="sub-events" class="form-label">
						Events
					</label>
					<div class="input-group mb-3">
						<select class="form-select" id="sub-events" multiple disabled>
							<option>You are not subscribed to any events</option>
						</select>
						<button class="btn btn-danger sub-clear-events" type="button" disabled>Clear</button>
					</div>
                </div>
				<div class="form-group mt-3">
                    <label for="sub-events" class="form-label">Matches</label>
                    <div class="input-group">
						<input type="text" class="form-control" id="sub-matches" value="You are not subscribed to any match updates" disabled>
						<button class="btn btn-danger sub-clear-matches" type="button" disabled>Clear</button>
					</div>
                </div>
				<div class="mt-5">
					<button type="submit" class="btn btn-danger" id="sub-reset">Unsubscribe from everything</button>
					<button type="submit" class="btn btn-primary pull-right" id="sub-apply-change">Save Changes</button>
				</div>
		</form>
	`)
	
	if(!("_updated" in subscription)) return console.log("Currently no server profile")
	
	$("#sub-updated").text(dateFormat(subscription._updated))
	if(!subscription._synced) {
		$("#sub-synced").text("No - please wait up to five minutes")
	}
	
	if(subscription.events.length > 0) {
		$("#sub-events option").remove()
		$(".sub-clear-events").removeAttr("disabled")
		
		subscription.events.sort((a, b) => {
			return b < a
		})
		for(const eventName of subscription.events) {
			const opt = document.createElement("option");
			opt.text = eventName
			opt.value = eventName
			
			$("#sub-events").append(opt)
		}
		
		// Handler events
		$("#sub-events").removeAttr("disabled").change(function(evt) {
			$(".sub-clear-events").text("Remove")
		})
		
		$(".sub-clear-events").click(function(evt) {
			const vals = $("#sub-events").val()
			
			if(!vals.length) {
				subscription.events = []
				$("#sub-events option").remove()
				
			} else {
				for(const removeEvent of vals) {
					subscription.events = removeItemOnce(subscription.events, removeEvent)
					$("#sub-events").find('option[value="'+removeEvent+'"]').remove()
				}
			}
			
			if(!$("#sub-events option").length) {
				$("#sub-events").append(`<option>You are not subscribed to any events anymore</option>`).attr("disabled", "disabled")
				$(".sub-clear-events").attr("disabled", "disabled")
			}
		})
	}
	
	if(subscription.matches.length > 0) {
		$(".sub-clear-matches").removeAttr("disabled")
		
		const pluralizedMatch = subscription.matches.length != 1 ? "matches" : "match"
		$("#sub-matches").val("You are subscribed to " + subscription.matches.length + " " + pluralizedMatch)
		
		// Handler matches
		$(".sub-clear-matches").click(function(evt) {
			subscription.matches = []
			$("#sub-matches").val("You are not subscribed to any matches anymore")
			$(".sub-clear-matches").attr("disabled", "disabled")
		})
	}
	
	$("#sub-reset").click(evt => {
		evt.preventDefault()
		
		subscription.matches = []
		subscription.events = []
		$("#sub-apply-change").click()
	})
	$("#sub-apply-change").click(evt => {
		evt.preventDefault()
		$("button, input").attr("disabled", "disabled")
		
		syncNewSubscriptions().then(() => {
			console.log("updated subscription", subscription)
			window.location = window.location
		})
	})
	
}, null, false)