# Current Behavior Baseline

This document captures the existing Next.js + Supabase behavior that the FastAPI + Vue implementation must preserve.

## Navigation

- Brand text: `RFZ照片墙`
- Routes:
  - `/members`
  - `/upload`
  - `/timeline`
  - `/wall`
- Root route `/` redirects to `/timeline`

## Data Sources

- `persons`
  - fields used by UI: `id`, `name`
- `photos`
  - fields used by UI: `id`, `title`, `image_url`, `shot_month`
- `photo_persons`
  - fields used by UI: `photo_id`, `person_id`
- Storage bucket: `photos`

## Members Page

Source: `app/members/page.tsx`

- On page load:
  - fetch all persons sorted by `id asc`
- Add member:
  - trim input
  - reject empty input
  - reject duplicate names using current in-memory list comparison
  - insert one row into `persons`
  - clear input and refetch list on success
- UI details:
  - Enter key triggers submit
  - badge shows current person count
  - no edit or delete actions

## Upload Page

Source: `app/upload/page.tsx`

- On page load:
  - fetch all persons sorted by `id asc`
- File selection:
  - accept multiple files
  - filter to image MIME types only
  - show alert if no image files remain
- Per-file defaults:
  - title defaults to filename without extension
  - shot month defaults to EXIF month if present
  - fallback shot month uses file `lastModified`
  - selected persons default to current batch defaults
- Batch editing behavior:
  - can apply default title to all
  - can apply default shot month to all
  - can apply default persons to all
  - can apply title + month + persons to all at once
- Queue management:
  - can remove one pending item
  - can clear all pending items
  - preview URLs are revoked when items are removed or page unmounts
- Upload flow for each file:
  1. upload file to storage bucket `photos`
  2. derive public URL from storage path
  3. insert row into `photos`
  4. insert selected relations into `photo_persons`
- Success behavior:
  - all files processed sequentially
  - on full success: alert success and clear queue
- Failure behavior:
  - show alert and stop the current batch immediately

## Timeline Page

Source: `app/timeline/page.tsx`

- On page load:
  - fetch all persons sorted by `id asc`
  - fetch all photos with nested `photo_persons -> persons`
  - sort by `shot_month desc nulls last`, then `id desc`
- Filtering:
  - filter by one person ID or show all
- Grouping:
  - group by year, then month
  - photos without `shot_month` appear under `未填写时间`
  - `未填写时间` is sorted after actual year/month groups
- Card actions:
  - preview photo
  - edit photo
  - delete photo
- Delete flow:
  1. confirm dialog
  2. delete matching rows from `photo_persons`
  3. delete photo row from `photos`
  4. refetch photos

## Wall Page

Source: `app/wall/page.tsx`

- On page load:
  - fetch all persons sorted by `id asc`
  - fetch all photos with nested `photo_persons -> persons`
  - sort by `id desc`
- Filtering:
  - filter by one person ID or show all
- Card behavior:
  - hover overlay with title, person names and shot month
  - click card to preview photo
  - edit photo
  - delete photo
- Delete flow:
  - same behavior as timeline page, but current code does not surface delete errors

## Edit Photo Modal

Source: `components/EditPhotoModal.tsx`

- Initial values:
  - title from selected photo
  - shot month from selected photo
  - selected persons from related `photo_persons`
- Save flow:
  1. update `photos.title` and `photos.shot_month`
  2. delete old rows from `photo_persons`
  3. insert the new selected relations
  4. call `onSaved()`
  5. close modal

## Photo Preview Modal

Source: `components/PhotoPreviewModal.tsx`

- Displays:
  - full image
  - title
  - joined person names
  - shot month
- Click mask or close button to dismiss

## Backend Contract Needed

The new backend must cover these logical operations:

- list persons
- create person
- list photos for timeline order
- list photos for wall order
- update photo metadata and related persons
- delete photo relations, photo row and storage object
- upload photos and create related records
