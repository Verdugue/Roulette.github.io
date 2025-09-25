const API_URL = 'https://roulettegithubio-production.up.railway.app';
const importBtn = document.getElementById('importBtn');
const createBtn = document.getElementById('createBtn');
const namesInput = document.getElementById('namesInput');
const notificationContainer = document.getElementById('notificationContainer');
const botActiveToggle = document.getElementById('botActiveToggle');
const teamsContainer = document.getElementById('teamsContainer');

function showNotification(message, type = 'info', duration = 4000) {
  const notif = document.createElement('div');
  notif.className = `notification ${type}`;
  notif.textContent = message;
  notificationContainer.appendChild(notif);
  
  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transform = 'translateY(-20px)';
    setTimeout(() => notif.remove(), 500);
  }, duration);
}

function splitIntoTeams(names, teamCount = 2) {
  const teams = Array.from({ length: teamCount }, () => []);
  const shuffled = [...names].sort(() => Math.random() - 0.5);
  shuffled.forEach((name, i) => teams[i % teamCount].push(name));
  return teams;
}

function displayTeamsHTML(teams) {
  teamsContainer.innerHTML = '';
  teams.forEach((team, index) => {
    const div = document.createElement('div');
    div.className = 'team';
    div.innerHTML = `<h3>Équipe ${index+1}</h3>${team.map(n => `<p>${n}</p>`).join('')}`;
    teamsContainer.appendChild(div);
  });
}

// Import members from voice channel
importBtn.addEventListener('click', async () => {
  if (!botActiveToggle.checked) return showNotification('Mode bot inactif: impossible de récupérer le vocal.', 'warning');
  try {
    const res = await fetch(`${API_URL}/getVoiceMembers`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    if (!data.members?.length) return showNotification('Aucun membre trouvé dans le vocal.', 'warning');
    namesInput.value = data.members.join('\n');
    showNotification('✅ Membres importés depuis le vocal !', 'success');
  } catch (err) {
    console.error(err);
    showNotification('Erreur lors de la récupération des membres', 'error');
  }
});

// Create teams
createBtn.addEventListener('click', async () => {
  const names = namesInput.value.trim().split('\n').map(n => n.trim()).filter(n => n);
  if (!names.length) return showNotification('Aucun membre à répartir.', 'warning');

  if (botActiveToggle.checked) {
    // Bot actif → backend
    try {
      const res = await fetch(`${API_URL}/createTeams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      showNotification('✅ Équipes créées ! Vérifie le message Discord du bot.', 'success');
      if (data.teams) displayTeamsHTML(data.teams); // si backend renvoie les teams
    } catch (err) {
      console.error(err);
      showNotification('Erreur lors de la création des équipes', 'error');
    }
  } else {
    // Bot inactif → juste HTML
    const teams = splitIntoTeams(names, 2);
    displayTeamsHTML(teams);
    showNotification('✅ Équipes créées en local (bot inactif).', 'success');
  }
});
