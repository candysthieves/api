import type { Post } from '../../../../generated/prisma/client.js';
import { PostsMapper } from './posts.mapper.js';

describe('PostsMapper', () => {
  it('preserves pending slots and returns numeric image dimensions', () => {
    const post = {
      id: 'post',
      description: 'description',
      images: [
        null,
        {
          fileId: 'file',
          url: 'https://example.com/file',
          width: 100,
          height: 200,
        },
      ],
      preview: null,
      createdAt: new Date('2026-09-08T00:00:00Z'),
      willBeDeleted: null,
    } as Post;
    const view = PostsMapper.toView(post);
    expect(view.images).toEqual([
      null,
      {
        fileId: 'file',
        url: 'https://example.com/file',
        width: 100,
        height: 200,
      },
    ]);
    expect(view.preview).toBeNull();
    expect(view).not.toHaveProperty('imageProcessing');
  });
});
