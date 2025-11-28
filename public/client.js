console.log("CLIENT JS LOADED");

// Connect to socket
const socket = io();

// UI elements
const roomsListEl = document.getElementById('rooms');
const btnCreateRoom = document.getElementById('btnCreateRoom');
const newRoomInput = document.getElementById('newRoom');
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const roomSelect = document.getElementById('roomSelect');
const btnJoin = document.getElementById('btnJoin');
const roomNameEl = document.getElementById('roomName');
const usersListEl = document.getElementById('usersList');
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

let currentRoom = null;

// Render rooms list
function renderRooms(rooms) {
  roomsListEl.innerHTML = '';
  rooms.forEach(room => {
    const li = document.createElement('li');
    li.textContent = room;
    li.onclick = () => openJoinModal(room);
    roomsListEl.appendChild(li);
  });
}

// Show popup for joining
function openJoinModal(room) {
  currentRoom = room;
  roomSelect.innerHTML = `<option value="${room}">${room}</option>`;
  loginModal.style.display = 'flex';
}

// Add message to chat
function addMessage({ from, html, timestamp, system, text, users }) {
  const div = document.createElement('div');
  div.className = 'message' + (system ? ' system' : '');

  const time = new Date(timestamp).toLocaleTimeString();

  if (system) {
    div.innerHTML = `<div class="text">${text}</div>`;
  } else {
    div.innerHTML =
      `<div class="meta">${from} • ${time}</div>
       <div class="text">${html}</div>`;
  }

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  if (users) {
    usersListEl.textContent = 'Users: ' + users.join(', ');
  }
}

// Load rooms when connected
socket.emit("getRooms", rooms => {
  renderRooms(rooms);
});

// Create room
btnCreateRoom.onclick = () => {
  const room = newRoomInput.value.trim();
  if (!room) return alert("Enter room name");

  socket.emit("createRoom", { room }, (res) => {
    if (res.error) return alert(res.error);
    renderRooms(res.rooms);
    newRoomInput.value = '';
  });
};

// Join room
btnJoin.onclick = () => {
  const username = usernameInput.value.trim();
  const room = roomSelect.value;

  if (!username) return alert("Enter a username");

  socket.emit("joinRoom", { username, room }, (res) => {
    if (res.error) return alert(res.error);

    // SUCCESS: hide popup and load room UI
    loginModal.style.display = "none";

    roomNameEl.textContent = room;
    messagesEl.innerHTML = "";
    usersListEl.textContent = "Users: " + res.users.join(", ");
  });
};

// Send message
messageForm.onsubmit = (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("sendMessage", { text }, () => {
    messageInput.value = "";
  });
};

// Server Events
socket.on("roomsList", renderRooms);

socket.on("systemMessage", data => {
  addMessage({
    system: true,
    text: data.text,
    timestamp: data.timestamp,
    users: data.users
  });
});

socket.on("message", msg => {
  addMessage({
    from: msg.from,
    html: msg.html,
    timestamp: msg.timestamp
  });
});

// Hide popup initially
loginModal.style.display = 'none';
