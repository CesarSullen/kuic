# Kuic

## Description

A **privacy-first** task list app that works **offline**.

## Features

- Create, edit, and delete lists and tasks
- Mark tasks as completed (with animation), or swipe a task left to delete it, with an undo option
- One list per screen: swipe between lists or use the tabs, the "+" next to the tabs creates a new list
- Search tasks and filter them by pending or completed
- Settings screen to rename or delete lists, import or export your data, and see the app version
- **Dynamic counters** for pending and completed tasks
- Import / Export data in JSON format
- Offline-first using Local Storage and Cache Storage
- Optimized for desktop and mobile

## Privacy and Data

Your lists and tasks are stored **locally** in your browser (Local Storage). Cache Storage only holds the app files so it works offline. Your tasks are never sent to any server.

The only thing the app sends is a visit counter increment to [Supabase](https://supabase.com) each time it is opened. It contains just the project name ("Kuic"), so I can get an idea of how much the app is used. It does not include your tasks nor any identifier of who you are.

## Technologies

- HTML5, CSS3, JavaScript
- Service Worker for PWA
- Local Storage for data persistence
- Cache Storage for offline-first
- Supabase (anonymous visit counter only)
- Web App Manifest → proper PWA install experience

## Try KUIC

You can try the application at the following link: [cesarsullen.github.io/kuic](https://cesarsullen.github.io/kuic).

I hope you enjoy! <3

## License

Licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.
