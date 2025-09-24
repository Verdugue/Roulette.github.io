// Éléments
const namesInput = document.getElementById('namesInput');
const exceptionsInput = document.getElementById('exceptionsInput');
const teamsSelect = document.getElementById('teamsSelect');
const launchBtn = document.getElementById('launchBtn');
const teamsContainer = document.getElementById('teamsContainer');
const webhookInput = document.getElementById('webhookInput');
const discordSection = document.getElementById('discordSection');
const sendToDiscordBtn = document.getElementById('sendToDiscordBtn');

// Couleurs pour les équipes
const TEAM_COLORS = [
	'#a78bfa', '#60a5fa', '#34d399', '#f59e0b', '#f472b6'
];

// Parse les noms depuis le textarea
function parseNames(text) {
	return text
		.split('\n')
		.map(name => name.trim())
		.filter(name => name.length > 0);
}

// Parse les exceptions depuis le textarea et retourne les exceptions + la liste complète des noms
function parseExceptions(text, names) {
	const exceptions = [];
	const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
	const allNames = [...names];
	
	// Si on a un nombre pair de lignes, traiter par paires
	if (lines.length >= 2 && lines.length % 2 === 0) {
		for (let i = 0; i < lines.length; i += 2) {
			const person1 = lines[i];
			const person2 = lines[i + 1];
			
			// Ajouter les personnes manquantes à la liste
			if (!allNames.includes(person1)) {
				allNames.push(person1);
			}
			if (!allNames.includes(person2)) {
				allNames.push(person2);
			}
			
			exceptions.push([person1, person2]);
		}
	} else {
		// Sinon, essayer le format classique "Alice et Bob"
		for (const line of lines) {
			// Support pour "Alice et Bob", "Alice, Bob", "Alice & Bob", etc.
			const pair = line.split(/\s+(?:et|&|,)\s+/i);
			if (pair.length === 2) {
				const person1 = pair[0].trim();
				const person2 = pair[1].trim();
				
				// Ajouter les personnes manquantes à la liste
				if (!allNames.includes(person1)) {
					allNames.push(person1);
				}
				if (!allNames.includes(person2)) {
					allNames.push(person2);
				}
				
				exceptions.push([person1, person2]);
			}
		}
	}
	
	return { exceptions, allNames };
}

// Mélange un tableau
function shuffle(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// Divise en équipes en respectant les exceptions
function splitIntoTeams(names, teamsCount, exceptions) {
	const teams = Array.from({ length: teamsCount }, () => []);
	const shuffledNames = shuffle([...names]);
	
	// Placement des personnes en respectant les exceptions et l'équilibre
	for (const name of shuffledNames) {
		let bestTeam = 0;
		let bestScore = -Infinity;
		
		// Trouver l'équipe avec le meilleur score (priorité absolue aux exceptions)
		for (let teamIndex = 0; teamIndex < teamsCount; teamIndex++) {
			const conflicts = countConflicts(name, teams[teamIndex], exceptions);
			const teamSize = teams[teamIndex].length;
			const avgTeamSize = shuffledNames.length / teamsCount;
			
			// Score basé sur : éviter les conflits (PRIORITÉ ABSOLUE) ET équilibrer les tailles
			let score = 0;
			
			// PRIORITÉ ABSOLUE : éviter les conflits d'exceptions
			if (conflicts === 0) {
				score += 10000; // Score très élevé pour les équipes sans conflits
			} else {
				score = -10000; // Score très négatif pour les équipes avec conflits
			}
			
			// Bonus secondaire pour équilibrer les équipes (seulement si pas de conflits)
			if (conflicts === 0 && teamSize < avgTeamSize) {
				score += (avgTeamSize - teamSize) * 100;
			}
			
			if (score > bestScore) {
				bestScore = score;
				bestTeam = teamIndex;
			}
		}
		
		teams[bestTeam].push(name);
	}
	
	return teams;
}

// Compte les conflits d'exceptions dans une équipe
function countConflicts(person, team, exceptions) {
	let conflicts = 0;
	
	for (const [person1, person2] of exceptions) {
		if ((person === person1 && team.includes(person2)) ||
			(person === person2 && team.includes(person1))) {
			conflicts++;
		}
	}
	
	return conflicts;
}

// Affiche les équipes
function displayTeams(teams) {
	teamsContainer.innerHTML = '';
	
	teams.forEach((team, index) => {
		const teamElement = document.createElement('div');
		teamElement.className = 'team';
		teamElement.style.borderLeft = `4px solid ${TEAM_COLORS[index]}`;
		
		teamElement.innerHTML = `
			<div class="title">
				<strong>Équipe ${index + 1}</strong>
				<span class="badge">${team.length} personne${team.length > 1 ? 's' : ''}</span>
			</div>
			<div class="list">
				${team.map(name => `<span class="name-chip">${escapeHtml(name)}</span>`).join('')}
			</div>
		`;
		
		teamsContainer.appendChild(teamElement);
	});
}

// Échappe le HTML
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// Animation d'apparition des équipes
function animateTeams() {
	const teams = teamsContainer.querySelectorAll('.team');
	teams.forEach((team, index) => {
		team.style.opacity = '0';
		team.style.transform = 'translateY(20px)';
		team.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
		
		setTimeout(() => {
			team.style.opacity = '1';
			team.style.transform = 'translateY(0)';
		}, index * 200);
	});
}

// Fonction principale
function createTeams() {
	const namesText = namesInput.value.trim();
	const exceptionsText = exceptionsInput.value.trim();
	
	if (!namesText) {
		alert('Veuillez entrer au moins une personne.');
		return;
	}
	
	const initialNames = parseNames(namesText);
	const { exceptions, allNames } = parseExceptions(exceptionsText, initialNames);
	
	// Mettre à jour la liste des noms si des personnes des exceptions ont été ajoutées
	if (allNames.length > initialNames.length) {
		namesInput.value = allNames.join('\n');
	}
	
	const teamsCount = parseInt(teamsSelect.value);
	
	// Debug : afficher les exceptions détectées
	if (exceptions.length > 0) {
		console.log('Exceptions détectées:', exceptions);
		const exceptionList = exceptions.map(([p1, p2]) => `${p1} ↔ ${p2}`).join(', ');
		console.log(`ℹ️ Exceptions à respecter : ${exceptionList}`);
	}
	
	if (allNames.length < teamsCount) {
		alert(`Il faut au moins ${teamsCount} personnes pour créer ${teamsCount} équipes.`);
		return;
	}
	
	// Essayer plusieurs configurations et choisir la meilleure
	let bestTeams = null;
	let bestScore = -Infinity;
	
	for (let attempt = 0; attempt < 10; attempt++) {
		const teams = splitIntoTeams(allNames, teamsCount, exceptions);
		const score = evaluateTeamConfiguration(teams, exceptions);
		
		if (score > bestScore) {
			bestScore = score;
			bestTeams = teams;
		}
	}
	
	// Vérifier s'il y a encore des conflits
	const remainingConflicts = checkRemainingConflicts(bestTeams, exceptions);
	if (remainingConflicts.length > 0) {
		const conflictList = remainingConflicts.map(([p1, p2]) => `${p1} et ${p2}`).join(', ');
		alert(`⚠️ Impossible de respecter toutes les exceptions. Conflits restants : ${conflictList}\n\nLes équipes ont été créées en minimisant les conflits.`);
	}
	
	// Affiche les équipes avec animation
	displayTeams(bestTeams);
	setTimeout(animateTeams, 100);
	
	// Afficher la section Discord si un webhook est configuré
	if (webhookInput.value.trim()) {
		discordSection.style.display = 'block';
		// Stocker les équipes pour l'envoi Discord
		window.currentTeams = bestTeams;
	}
	
	// Scroll vers les résultats
	teamsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Évalue la qualité d'une configuration d'équipes
function evaluateTeamConfiguration(teams, exceptions) {
	let score = 0;
	
	// Bonus pour équilibrer les équipes
	const teamSizes = teams.map(team => team.length);
	const avgSize = teamSizes.reduce((a, b) => a + b, 0) / teams.length;
	const variance = teamSizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0);
	score -= variance; // Moins de variance = meilleur score
	
	// Pénalité pour les conflits d'exceptions
	const conflicts = checkRemainingConflicts(teams, exceptions);
	score -= conflicts.length * 100;
	
	return score;
}

// Vérifie les conflits restants après répartition
function checkRemainingConflicts(teams, exceptions) {
	const conflicts = [];
	
	for (const team of teams) {
		for (const [person1, person2] of exceptions) {
			if (team.includes(person1) && team.includes(person2)) {
				conflicts.push([person1, person2]);
			}
		}
	}
	
	return conflicts;
}

// Fonction pour envoyer les équipes sur Discord
async function sendToDiscord() {
	const webhookUrl = webhookInput.value.trim();
	
	if (!webhookUrl) {
		alert('Veuillez entrer une URL de webhook Discord.');
		return;
	}
	
	if (!window.currentTeams) {
		alert('Aucune équipe à envoyer. Créez d\'abord les équipes.');
		return;
	}
	
	// Désactiver le bouton pendant l'envoi
	sendToDiscordBtn.disabled = true;
	sendToDiscordBtn.innerHTML = `
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
		</svg>
		Envoi en cours...
	`;
	
	try {
		// Créer un embed Discord pour un meilleur affichage
		const embed = {
			title: '🎯 **ÉQUIPES CRÉÉES !** 🎯',
			description: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 **Voici la répartition des équipes :**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			color: 0x5865f2, // Couleur Discord bleue
			fields: [],
			timestamp: new Date().toISOString()
		};
		
		// Ajouter chaque équipe comme un field
		window.currentTeams.forEach((team, index) => {
			const teamMembers = team.map(name => `🔸 **${name}**`).join('\n');
			embed.fields.push({
				name: `🏆 **ÉQUIPE ${index + 1}** (${team.length} personne${team.length > 1 ? 's' : ''})`,
				value: teamMembers,
				inline: false
			});
		});
		
		// Envoyer le message via webhook avec embed
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username: 'Roulette d\'équipes',
				embeds: [embed]
			})
		});
		
		if (response.ok) {
			// Succès
			sendToDiscordBtn.innerHTML = `
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
				</svg>
				Envoyé !
			`;
			sendToDiscordBtn.style.background = '#10b981';
			
			setTimeout(() => {
				sendToDiscordBtn.disabled = false;
				sendToDiscordBtn.innerHTML = `
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
					</svg>
					Envoyer sur Discord
				`;
				sendToDiscordBtn.style.background = '#5865f2';
			}, 2000);
		} else {
			throw new Error(`Erreur HTTP: ${response.status}`);
		}
	} catch (error) {
		console.error('Erreur lors de l\'envoi sur Discord:', error);
		alert(`Erreur lors de l'envoi sur Discord: ${error.message}\n\nVérifiez que l'URL du webhook est correcte.`);
		
		// Restaurer le bouton
		sendToDiscordBtn.disabled = false;
		sendToDiscordBtn.innerHTML = `
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
				<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
			</svg>
			Envoyer sur Discord
		`;
		sendToDiscordBtn.style.background = '#5865f2';
	}
}

// Événements
launchBtn.addEventListener('click', createTeams);
sendToDiscordBtn.addEventListener('click', sendToDiscord);

// Enter dans le textarea lance aussi
namesInput.addEventListener('keydown', (e) => {
	if (e.ctrlKey && e.key === 'Enter') {
		createTeams();
	}
});

// Exemple de données
function loadExample() {
	const examples = [
		{
			names: 'Alice\nBob\nChloé\nDavid\nEmma\nFarid\nGiulia\nHugo\nInès\nJules\nKarim\nLéa',
			exceptions: 'Alice et Bob\nChloé et David'
		},
		{
			names: 'Marie\nPierre\nSophie\nThomas\nCamille\nAntoine\nJulie\nNicolas\nSarah\nMaxime',
			exceptions: 'Marie et Pierre\nSophie et Thomas'
		},
		{
			names: 'Anaïs\nBaptiste\nClara\nDamien\nÉléonore\nFabien\nGabrielle\nHenri\nIsabelle\nJonathan',
			exceptions: 'Anaïs et Baptiste\nClara et Damien'
		}
	];
	
	const randomExample = examples[Math.floor(Math.random() * examples.length)];
	namesInput.value = randomExample.names;
	exceptionsInput.value = randomExample.exceptions;
}

// Ajouter un bouton exemple si nécessaire
document.addEventListener('DOMContentLoaded', () => {
	// Optionnel: ajouter un bouton pour charger un exemple
	const controls = document.querySelector('.controls');
	const exampleBtn = document.createElement('button');
	exampleBtn.textContent = 'Exemple';
	exampleBtn.className = 'ghost';
	exampleBtn.type = 'button';
	exampleBtn.addEventListener('click', loadExample);
	
	const row = document.querySelector('.row');
	row.appendChild(exampleBtn);
});