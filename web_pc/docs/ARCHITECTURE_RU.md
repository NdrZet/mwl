# Z Музыка — Архитектура и внутренняя документация

## 1. Обзор проекта

- **Назначение**: офлайн-плеер для локальной музыки с плейлистами, поиском, извлечением метаданных и красивым UI.
- **Платформа**: Desktop (Windows; кроссплатформенно возможно), на базе Electron.
- **Фронтенд**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui.
- **Бэкенд-часть**: основной процесс Electron (`electron.cjs`) и «мост» `preload.js` (IPC API для рендера).
- **Ключевые зависимости**:
  - `electron` — контейнер десктоп‑приложения
  - `music-metadata` — чтение метаданных аудио (title/artist/album/cover/duration)
  - `react`, `react-dom` — UI
  - `vite`, `@vitejs/plugin-react` — сборка фронтенда
  - `tailwindcss`, `postcss`, `autoprefixer` — стили

## 2. Сборка и запуск

- Точка запуска Electron: поле `main` в `package.json` — `electron.cjs`.
- Основные скрипты `package.json`:
  - `dev`: Vite дев‑сервер для фронтенда (браузерный режим)
  - `build`: `tsc && vite build` → сборка React в `dist/`
  - `start`: `electron-forge start` (запуск в Electron)
  - `package`/`make`: упаковка через Electron Forge (Squirrel/ZIP)
- Vite-конфиг (`vite.config.ts`): `base: './'` — критично для корректной загрузки `index.html` из файловой системы в Electron.
- Tailwind (`tailwind.config.js`): тёмная тема по классу `dark`, маппинг CSS-переменных на токены Tailwind.

## 3. Структура директорий

- `src/` — исходники фронтенда
  - `main.tsx` — вход React, монтирует `App`
  - `App.tsx` — каркас приложения, левая панель, области контента, нижний плеер
  - `components/`
    - `MusicContext.tsx` — состояние и бизнес‑логика аудио, очереди, плейлисты, сохранение треков
    - `MusicPlayer.tsx` — нижняя панель управления воспроизведением + полноэкранный режим
    - `FileUpload.tsx` — импорт файлов (input, DnD, системный диалог в Electron)
    - `TrackList.tsx` — таблица треков, поиск, меню действий
    - `PlaylistManager.tsx` — плейлисты, создание, удаление, воспроизведение
    - `AlbumsGrid.tsx` — группировка треков по альбомам, просмотр и запуск
    - `ui/` —atoms/молекулы из shadcn/ui (кнопки, инпуты, слайдеры и т.д.)
  - `styles/globals.css` — CSS‑переменные тем и базовые стили
- `electron.cjs` — основной процесс Electron (окно, IPC‑обработчики, кеш обложек)
- `preload.js` — контекстный мост (exposeInMainWorld) для безопасного IPC из React
- `dist/` — результат сборки Vite (используется Electron для загрузки UI)

## 4. Поток данных и IPC

Рендер (React) не имеет прямого доступа к Node API из‑за `contextIsolation: true` и `nodeIntegration: false`. Взаимодействие идёт через IPC, выставленный в `preload.js` под `window.electronAPI`:

- `loadTracks(): Promise<Track[]>` — чтение `tracks.json` из `app.getPath('userData')`
- `saveTracks(tracks: Track[])` — запись списка треков на диск
- `getMetadata(filePath: string)` — извлечение метаданных через `music-metadata`
- `selectFiles()` — системный диалог выбора файлов, отдаёт абсолютные пути
- `getCoverPath(filePath: string)` — возвращает `file:///...` путь к миниатюре обложки (создаёт кеш при необходимости)

Основной процесс обрабатывает соответствующие каналы в `electron.cjs` (`ipcMain.handle`/`on`).

## 5. Модель данных

Тип `Track` (`MusicContext.tsx`):
- `id: string` — уникальный идентификатор (UUID или генерация по времени)
- `name: string` — название трека
- `artist: string`
- `album: string`
- `duration: number` — секунды
- `path: string` — в Electron абсолютный путь к файлу, в браузере — `blob:` URL
- `cover: string | null` — в браузере base64 `data:`; в Electron предпочтительно `file:///...` на миниатюру
- `lastPlayedAt?: number` — для сортировки «Недавно воспроизводимые»

Тип `Playlist`:
- `id: string`
- `name: string`
- `tracks: string[]` — массив `Track.id`
- `createdAt: Date`

## 6. Источники и персист данных

- В Electron:
  - Список треков хранится в `tracks.json` (`userData/tracks.json`). Сохраняются только треки с «реальными» путями (не `blob:`, `data:`, `http`).
  - Обложки кешируются в `userData/covers/` как `png` 1024×1024 (или исходник, если ресайз не удался) с хешированным именем (`md5`). В React используются `file:///...` ссылки.
- В браузере (dev через Vite):
  - Треки и плейлисты — в `localStorage` (`musicApp_tracks`, `musicApp_playlists`).

## 7. Жизненный цикл и инициализация

- Electron: `createWindow()` → грузит `dist/index.html` по `file://` URL, убирает меню, подключает `preload.js`.
- React: `MusicProvider` делает начальную загрузку треков:
  - Если Electron: `window.electronAPI.loadTracks()` + попытка дополнить/мигрировать обложки через `getCoverPath`.
  - Если браузер: загрузка из `localStorage`.
- Периодическая задача раз в 5 сек: дозагрузка обложек для треков без `cover` (ограничение по 2 за проход).
- Одноразовое обновление кеша обложек до 1024 px (флаг `localStorage: cover_cache_size = '1024'`).

## 8. Воспроизведение аудио

- Единый `HTMLAudioElement` хранится в `MusicContext` (`audioRef`).
- `play(track?)`:
  - Если задан новый трек — формирует корректный `src`.
    - В Electron: для абсолютного пути — нормализует в `file:///C:/...` (замена слешей), для `blob:`/`data:`/`http` использует как есть.
    - В браузере: `src = track.path` (обычно `blob:`).
  - Управляет состояниями `isPlaying`, `currentTrack`, сбрасывает позицию, ловит ошибки воспроизведения.
- Слушатели: `timeupdate`, `durationchange`, `ended` — обновление прогресса и переход к следующему треку.
- Очередь (`queue`) и курсор (`currentQueueIndex`) — поддержка `next/previous`, «Play All», воспроизведение плейлистов/альбомов/фильтра.

## 9. Загрузка файлов

- `FileUpload`:
  - Кнопка вызывает системный диалог в Electron (`selectFiles()`), чтобы получить абсолютные пути. Затем, передаёт «File‑подобные» объекты с `path` в `addTrack()`.
  - Fallback: `<input type="file" multiple>` и DnD, фильтрация по расширению/`mime`.
  - `addTrack(file)`:
    - В браузере: создаёт `blob:` URL, читает `duration` через временный `Audio`.
    - В Electron: если есть валидный абсолютный путь — извлекает метаданные через IPC и создаёт объект трека; иначе fallback как в браузере.

## 10. UI и навигация

- `App.tsx` содержит боковую панель и переключатель вьюшек (локальный `useState<View>`):
  - `home` — приветственный экран с быстрыми плитками, «Недавние альбомы», «Recently Played»
  - `search` — поиск по трекам (внутри `TrackList`)
  - `library` — вся библиотека + кнопка «Add Music»
  - `playlists` — менеджер плейлистов
  - `albums` — все альбомы
  - `liked` — «понравившиеся» (визуальный экран; флагов лайка в модели пока нет)
  - `upload` — импорт музыки
- `MusicPlayer` — нижняя панель: инфо о треке, управление, прогресс‑бар, громкость, полноэкранный режим.
- `TrackList` — таблица с быстрым воспроизведением, меню «Add to Playlist», удаление, «Play All», поиск.
- `AlbumsGrid` — группировка по `album`, модальное окно с треками альбома.
- `PlaylistManager` — создание/удаление, предпросмотр, воспроизведение.

## 11. Обработка обложек (covers)

На стороне Electron (`electron.cjs`):
- По `get-cover-path`:
  1) Пытается извлечь встроенную обложку из файла (`music-metadata`).
  2) Если нет — ищет в папке файла кандидатов: `cover|folder|front.(jpg|png)`.
  3) Ресайз до PNG 1024×1024 через `nativeImage` (лучшее качество). Если не удалось — сохраняет исходник.
  4) Имя файла — `md5(buffer)` + расширение; путь возвращается как `file:///...`.
- Доп. хелперы: `sniffExt`, `resizeToPng`, `writeCover`, каталог `covers/` создаётся по требованию.

## 12. Безопасность Electron

- `nodeIntegration: false`, `contextIsolation: true` — рекомендованные настройки.
- Включено `webSecurity: false` для разрешения загрузки локальных файлов (плеер), т.к. UI грузится с `file://`.
- Все узкие места Node скрыты за IPC в `preload.js`, интерфейс минимален.

## 13. Конфигурация TypeScript и ESLint

- `tsconfig.app.json`: режим сборщика, `strict: false`, отключён `noImplicitAny`, включены проверки на неиспользуемые сущности; `jsx: react-jsx`.
- `tsconfig.node.json`: строгий режим для `vite.config.ts`.
- ESLint: набор рекомендуемых правил JS/TS + `react-hooks` + `react-refresh`, игнор `dist/`.

## 14. Сборка, упаковка, дистрибуция

- `electron-forge` с мейкерами:
  - `@electron-forge/maker-squirrel` — Windows инсталлятор
  - `@electron-forge/maker-zip` — zip‑архив
- `packagerConfig.icon`: `assets/icon` (без расширения), для Windows генерится `icon.ico` (см. `dist/`/`public/`).

## 15. Производительность

- Используются мемоизации в UI точечно (`useMemo` в `AlbumsGrid`).
- Ленивая дозагрузка обложек пачками, не более 2 за 5 сек, снижает нагрузку на диск/CPU.
- Один `audio` инстанс на всё приложение.

## 16. Расширение функциональности (дорожная карта)

Идеи из `README.md` и текущей архитектуры:
- Горячие клавиши плеера на уровне окна (Electron глобальные шорткаты).
- Визуализация аудио (Web Audio API в рендере, без Node привилегий).
- Веб‑радио/потоки: допускается, но такие треки не сохраняются в `tracks.json` (URL), нужно расширить модель/персистентность.
- Синхронизация с облаком: шифрованный индекс + локальный кеш обложек.
- «Нравится»/«Избранное»: добавить флаг в `Track` и хранение.

## 17. Границы и ограничения

- Сохранение плейлистов — только в `localStorage`. При желании можно перенести в файл в `userData`.
- Метаданные читаются синхронно через IPC вызов, но фактическая загрузка обложек — отложенная.
- `webSecurity: false` — компромисс из‑за локального доступа к файлам. UI управляется локально, не грузит удалённый контент.

## 18. Качество кода и стиль

- Конвенции: явные, говорящие имена, минимум вложенности, guard‑ветки, обработка краевых случаев.
- Комментарии там, где есть нетривиальная логика (обложки, IPC, формирование `file:///` путей для Windows).
- UI‑код следует Tailwind‑подходу, избегает инлайн‑комментариев.

## 19. Точки интеграции

- Единственная внешняя интеграция — файловая система через Electron main + `music-metadata`.
- Нет сетевых запросов в текущей версии.

## 20. Как добавить новый функционал

- Новый IPC метод:
  1) Добавить `ipcMain.handle('channel', handler)` в `electron.cjs`.
  2) Экспортировать в `preload.js` через `contextBridge.exposeInMainWorld`.
  3) Описать типы метода в `MusicContext.tsx` (declare global Window.electronAPI).
  4) Использовать в React компонентах/контекстах.

- Новая сущность данных (например, «Like»):
  1) Расширить интерфейс `Track`.
  2) Правки логики сохранения в `MusicContext` (localStorage/Electron save).
  3) Обновить UI (`TrackList`, `MusicPlayer`).

## 21. Диагностика и отладка

- Открыть DevTools вручную (F12); авто‑открытие отключено.
- Логи ошибок в main‑процессе — в stdout/консоль.
- IPC ошибок при метаданных/обложках не прерывают UX — есть безопасные фоллбэки.

## 22. Часто задаваемые вопросы

- Почему `base: './'` в Vite? — Чтобы `index.html` и ассеты корректно резолвились из `file://` при загрузке в Electron без dev‑сервера.
- Почему `webSecurity: false`? — Для разрешения локальных файловых URL в плеере и обложках, т.к. UI загружается из `file://`.
- Где хранятся данные? — Треки: `userData/tracks.json` (Electron) или `localStorage` (браузер). Обложки: `userData/covers/`.
- Как формируется `audio.src` под Windows? — `file:///` + путь с прямыми слешами, либо оставляется как есть для `blob:`/`data:`/`http`.

## 23. Лицензирование

См. `README.md`. Модификация/изменение разрешены для личного использования, свободное распространение ок.

