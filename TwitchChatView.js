var chatNameColors = ["#FF0000", "#0000FF", "#008000", "#B22222", "#FF7F50", "#9ACD32", "#FF4500", "#2E8B57", "#DAA520", "#D2691E", "#5F9EA0", "#1E90FF", "#FF69B4", "#8A2BE2", "#00FF7F"];

var app = {
	chatLog: [],
	maxFetches: 5,
	maxChatBlocks: 500
};

var clientIdInput = document.getElementById('client-id');
var voidIdInput = document.getElementById('vod-id');
var getChatButton = document.getElementById('get-chat-button');
var maxFetchesInput = document.getElementById('max-fetches');
var fetchStatusSpan = document.getElementById('fetch-status');

var autosearchInput = document.getElementById('autosearch');
var chatSearchInput = document.getElementById('chat-search');
var chatSearchButton = document.getElementById('chat-search-button');
var chatLogDiv = document.getElementById('chat-log');
var maxChatBlocksInput = document.getElementById('max-chat-blocks');

getChatButton.addEventListener('click', getChatForVod);
chatSearchButton.addEventListener('click', searchChat);
chatSearchInput.addEventListener('input', e => autosearchInput.checked && searchChat());
maxFetchesInput.addEventListener('change', function(e) { 
	app.maxFetches = parseInt(this.value); 
	if (isNaN(app.maxFetches)) {
		app.maxFetches = 5;
		this.value = app.maxFetches;
	}
});
clientIdInput.addEventListener('change', function(e) {
	if(this.value == 'Groovy') {
		this.value = 'jzkbprff40iqj646a697cyrvl0zt2m6';
	}
});
maxChatBlocksInput.addEventListener('change', function(e) {
	
	if(this.value < this.min) this.value = this.min;
	if(parseInt(this.value) > parseInt(this.max)) this.value = this.max;
	if(isNaN(this.value)) this.value = 500;
	
	if(app.maxChatBlocks != this.value) {
		app.maxChatBlocks = this.value;
		searchChat();
	}
});

	/* var clusterize = new Clusterize({
	  scrollId: 'chat-container',
	  contentId: 'chat-log',
	  tag: 'div',
	  rows_in_block: 10,
	  blocks_in_cluster: 2
	}); */

function getChatForVod() {
	getChatButton.disabled = true;
	
	var clientId = clientIdInput.value;
	var vodId = voidIdInput.value;
	
	var validationErrors = [];
	if(!clientId) {
		validationErrors.push('Please enter your Twitch API Client ID (see: https://dev.twitch.tv/dashboard/apps)');
	}
	if(!vodId || !/[0-9]+/.test(vodId)) {
		validationErrors.push('Please enter a valid VOD ID');
	}
	if(validationErrors.length > 0) {
		alert('Error getting chat.\n' + validationErrors.join('\n'));
		getChatButton.disabled = false;
		return false;
	}

	fetchStatusSpan.innerText = 'Fetching...';
	
	chatLogDiv.innerHTML = '';
	app.chatLog = [];
	getChatLog({
		vodId,
		clientId,
		cursor: null,
		currFetchIndex: 0,
	});
};


function getChatLog(options) {
	let url = 'https://api.twitch.tv/v5/videos/'+ options.vodId +'/comments?';
	url += (options.cursor == null ? 'content_offset_seconds=0' : 'cursor=' + options.cursor);
	$.ajax({
		url,
		headers: {
		 'Client-ID': options.clientId  
		}
	}).done(res => {
		app.chatLog.push(...res.comments.map(c => {
			return {
				commenter: {
					display_name: c.commenter.display_name
				},
				message: {
					user_color: c.message.user_color,
					body: c.message.body
				},
				content_offset_seconds: c.content_offset_seconds
			};
		}));
		options.cursor = res._next;
		options.currFetchIndex++;
		fetchStatusSpan.innerText = 'Fetching... (' + options.currFetchIndex + ')';
		
		displayChat(app.chatLog, true);
		if(options.cursor && options.currFetchIndex < app.maxFetches) {
			getChatLog(options);
		} else {
			// Finished
			fetchStatusSpan.innerText = 'Finished';
			getChatButton.disabled = false;
			searchChat();
		}

	}).fail(res => {
		console.error(res);
		fetchStatusSpan.innerText = 'Failed';
		alert('Problem getting Twitch chat!\n' + res.responseJSON.error + '\n' + res.responseJSON.message);
		getChatButton.disabled = false;
	});
}

function displayChat(chatLog, append) {
	if(!append) {
		chatLogDiv.innerHTML = '';
	}
	for(var i = 0; i < chatLog.length && i < app.maxChatBlocks; i++) {
		var c = chatLog[i];
		var chatBlock = document.createElement('div');
		var chatTime = document.createElement('div');
		var chatName = document.createElement('span');
		var chatMessage = document.createElement('div');
		var chatComment = document.createElement('span');
		
		chatBlock.classList.add('chat-block');
		chatTime.classList.add('chat-time');
		chatName.classList.add('chat-name');
		chatMessage.classList.add('chat-message');
		
		var chatNameColor = c.message.user_color || assignNameColor(c.commenter.display_name);
		chatName.style.color = chatNameColor;
		
		chatTime.innerText = '[' + getVideoTimeString(c.content_offset_seconds) + ']';
		chatName.innerText = c.commenter.display_name;
		chatComment.innerText = c.message.body;
		chatMessage.appendChild(chatName);
		chatMessage.appendChild(chatComment);
		
		chatBlock.appendChild(chatTime);
		chatBlock.appendChild(chatMessage);
		
		chatLogDiv.appendChild(chatBlock);
	}
}

function searchChat() {
	var searchTerm = chatSearchInput.value;
	if(app.chatLog.length === 0) {
		alert('No chat log.');
		return false;
	}
	
	var chatLog = app.chatLog.filter(c => {
		return c.message.body.toUpperCase().includes(searchTerm.toUpperCase());
	});
	
	displayChat(chatLog, false);
}

function getVideoTimeString(seconds) {
	var h = Math.floor(seconds / (60*60));
	var m = Math.floor((seconds / 60)) - (h*60);
	var s = Math.floor(seconds%60);
	if(s < 10) s = '0' + s;
	if(h > 0 && m < 10) m = '0' + m;
	return (h ? h+':' : '') + m + ':' + s;
}

function assignNameColor(name) {
	function charToNumber (s, i) {
		return parseInt(s.charAt(i), 36) - 9;
	}
	function sumChars (s) {
		var i = s.length, r = 0;
		while (--i >= 0) r += charToNumber(s, i);
		return r;
	}
	return chatNameColors[sumChars(name) % chatNameColors.length];
}