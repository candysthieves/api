import type { ImageEvent, PostMediaState } from './post-image.contract.js';

export function applyImageEvent(
  state: PostMediaState,
  event: ImageEvent,
): PostMediaState {
  const data = event.data;
  const slot = state.imageProcessing[data.index];
  if (!slot || slot.imageId !== data.imageId)
    throw new Error('IMAGE_ID_MISMATCH');
  if (data.revision <= slot.revision || slot.status === 'READY') return state;
  if (data.status === 'FAILED' && !data.error)
    throw new Error('INVALID_FAILED_EVENT');
  if (data.status !== 'FAILED' && data.error)
    throw new Error('INVALID_ERROR_EVENT');
  if (
    data.status === 'READY' &&
    (!data.image || (data.index === 0 && !data.preview))
  ) {
    throw new Error('INVALID_READY_EVENT');
  }

  const images = [...state.images];
  images[data.index] = data.status === 'READY' ? data.image : null;
  const imageProcessing = state.imageProcessing.map((current, index) =>
    index === data.index
      ? {
          ...current,
          status: data.status,
          attempts: data.attempts,
          error: data.error,
          revision: data.revision,
          dispatchPending: false,
        }
      : current,
  );
  return {
    images,
    imageProcessing,
    preview: data.index === 0 ? data.preview : state.preview,
  };
}
