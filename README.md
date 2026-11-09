# Board Live

Outil de gestion de projet collaboratif en temps réel, dans l'esprit de
Trello : tableaux, listes et cartes avec glisser-déposer, mais où chaque
changement apparaît **instantanément** chez tous les membres connectés, sans
recharger la page.

## Fonctionnalités

- **Tableaux** avec listes et cartes (titre, description, échéance, membre assigné).
- **Glisser-déposer** des cartes entre listes (`@hello-pangea/dnd`), avec la
  nouvelle position synchronisée en direct pour tout le monde.
- **Temps réel** via WebSocket (Socket.IO) : un changement fait par un membre
  (déplacer une carte, créer une liste, éditer un titre...) s'affiche chez
  les autres sans rafraîchir.
- **Présence live** : qui est connecté sur le tableau en ce moment.
- **Gestion des membres** : inviter quelqu'un sur un tableau, rôles (propriétaire / membre).
- **Authentification** par email/mot de passe (JWT), avec réinitialisation
  du mot de passe par email (Resend).
- **Thème clair/sombre**.

## Pile technique

- **Backend** : NestJS, Socket.IO (`@nestjs/websockets`), Prisma (PostgreSQL), JWT, bcrypt.
- **Frontend** : React + Vite + TypeScript, React Router, `socket.io-client`, `@hello-pangea/dnd`.

## Modèle de données

`User` · `Board` · `BoardMember` (rôle par tableau) · `List` · `Card`
(assignable, avec échéance) · `PasswordResetToken`.

## Installation

### Base de données

Nécessite PostgreSQL. Crée une base et renseigne son URL dans `backend/.env`
(copie `backend/.env.example` comme modèle) :

```
DATABASE_URL="postgresql://user:password@localhost:5432/boardlive"
JWT_SECRET="change-moi"
RESEND_API_KEY="(optionnel, pour l'email de réinitialisation de mot de passe)"
```

### Backend

```
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend

Dans un autre terminal :

```
cd frontend
npm install
npm run dev
```

Renseigne l'URL du backend dans `frontend/.env` (copie `.env.example`) si besoin.

## Pourquoi ce projet pour un portfolio

Ce projet est centré sur le **temps réel** : contrairement à une app classique
qui recharge des données via l'API à chaque action, ici chaque client garde
une connexion WebSocket ouverte et reçoit les changements des autres
utilisateurs au fur et à mesure. Ça couvre des problèmes concrets (garder
plusieurs clients synchronisés, gérer les déconnexions, autoriser les actions
par rôle) qui ne se posent pas sur un simple CRUD REST.
