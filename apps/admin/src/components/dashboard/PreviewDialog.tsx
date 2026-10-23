import { useMemo, useState } from 'react';



// export default function PreviewDialog({
//     initialData = {},
//     onCancel
// }) {



//     const [formData, setFormData] = useState({
//         postFormat: initialData.postFormat || 'standard',
//         title: initialData.title || '',
//         excerpt: initialData.excerpt || '',
//         content: initialData.content || '',
//         cate: initialData.cate || '',
//         cate_bg: initialData.cate_bg || '',
//         cate_img: initialData.cate_img || '/openpress-quill-nobg-trim.png/cccccc/ffffff?text=Category',
//         tags: initialData.tags ? initialData.tags.join(', ') : '',
//         featureImg: initialData.featureImg || '/openpress-share.png/cccccc/ffffff?text=Featured+Image',
//         date: initialData.date || '',
//         post_views: initialData.post_views || '',
//         post_share: initialData.post_share || '',
//         author_name: initialData.author_name || '',
//         author_desg: initialData.author_desg || '',
//         author_img: initialData.author_img || '/openpress-quill-nobg-trim.png/cccccc/ffffff?text=Author',
//         author_bio: initialData.author_bio || '',
//         author_social: initialData.author_social || []
//     });









//     return (
//         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 fixed inset-0 bg-opacity-50 z-50">
//             <div className="max-w-4xl mx-auto">
//                 <div className="mb-8">
//                     <h1 className="text-3xl font-bold text-gray-900">
//                         {initialData._id ? 'Edit Article' : 'Create New Article'}
//                     </h1>
//                     <p className="text-gray-600 mt-2">
//                         {initialData._id
//                             ? 'Make changes to your article below'
//                             : 'Fill out the details below to create your new post'}
//                     </p>
//                 </div>

//                 <div className="space-y-6">


//                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
//                         <div>
//                             <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Title *
//                             </label>
//                             <input
//                                 id="title"
//                                 name="title"
//                                 type="text"
//                                 required
//                                 className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
//                                 value={formData.title}
//                             />
//                         </div>

//                         <div>
//                             <label htmlFor="postFormat" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Post Format
//                             </label>
//                             <select
//                                 id="postFormat"
//                                 name="postFormat"
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//                                 value={formData.postFormat}
//                             >
//                                 <option value="standard">Standard</option>
//                                 <option value="video">Video</option>
//                                 <option value="audio">Audio</option>
//                                 <option value="gallery">Gallery</option>
//                                 <option value="quote">Quote</option>
//                                 <option value="text">Text</option>
//                             </select>
//                         </div>
//                     </div>

//                     <div>
//                         <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
//                             Excerpt *
//                         </label>
//                         <textarea
//                             id="excerpt"
//                             name="excerpt"
//                             required
//                             rows={3}
//                             className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
//                             value={formData.excerpt}
//                         />
//                     </div>

//                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
//                         <div>
//                             <label htmlFor="cate" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Category *
//                             </label>
//                             <input
//                                 id="cate"
//                                 name="cate"
//                                 type="text"
//                                 required
//                                 className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
//                                 value={formData.cate}
//                             />
//                         </div>

//                         <div>
//                             <label htmlFor="cate_bg" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Category Background
//                             </label>
//                             <input
//                                 id="cate_bg"
//                                 name="cate_bg"
//                                 type="text"
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//                                 value={formData.cate_bg}
//                                 placeholder="bg-color-purple-one"
//                             />
//                         </div>

//                         <div>
//                             <label htmlFor="cate_img" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Category Image URL
//                             </label>
//                             <input
//                                 id="cate_img"
//                                 name="cate_img"
//                                 type="url"
//                                 className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
//                                 value={formData.cate_img}
//                                 placeholder="https://example.com/category-image.png"
//                             />
//                         </div>
//                     </div>

//                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
//                         <div>
//                             <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Tags (comma separated)
//                             </label>
//                             <input
//                                 id="tags"
//                                 name="tags"
//                                 type="text"
//                                 className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
//                                 value={formData.tags}
//                                 placeholder="Gaming, Adventure, Travel"
//                             />
//                         </div>

//                         <div>
//                             <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Date
//                             </label>
//                             <input
//                                 id="date"
//                                 name="date"
//                                 type="text"
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//                                 value={formData.date}
//                                 placeholder="Jun 30 2020"
//                             />
//                         </div>
//                     </div>

//                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
//                         <div>
//                             <label htmlFor="post_views" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Post Views
//                             </label>
//                             <input
//                                 id="post_views"
//                                 name="post_views"
//                                 type="text"
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//                                 value={formData.post_views}
//                                 placeholder="2K Views"
//                             />
//                         </div>

//                         <div>
//                             <label htmlFor="post_share" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Post Shares
//                             </label>
//                             <input
//                                 id="post_share"
//                                 name="post_share"
//                                 type="text"
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//                                 value={formData.post_share}
//                                 placeholder="250 Shares"
//                             />
//                         </div>
//                     </div>

//                     <div>
//                         <label htmlFor="featureImg" className="block text-sm font-medium text-gray-700 mb-1">
//                             Featured Image URL *
//                         </label>
//                         <input
//                             id="featureImg"
//                             name="featureImg"
//                             type="url"
//                             className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
//                             value={formData.featureImg}
//                             placeholder="https://example.com/featured-image.jpg"
//                         />
//                     </div>

//                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
//                         <div>
//                             <label htmlFor="author_name" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Author Name *
//                             </label>
//                             <input
//                                 id="author_name"
//                                 name="author_name"
//                                 type="text"
//                                 className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
//                                 value={formData.author_name}
//                             />
//                         </div>

//                         <div>
//                             <label htmlFor="author_desg" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Author Designation
//                             </label>
//                             <input
//                                 id="author_desg"
//                                 name="author_desg"
//                                 type="text"
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//                                 value={formData.author_desg}
//                             />
//                         </div>

//                         <div>
//                             <label htmlFor="author_img" className="block text-sm font-medium text-gray-700 mb-1">
//                                 Author Image URL
//                             </label>
//                             <input
//                                 id="author_img"
//                                 name="author_img"
//                                 type="url"
//                                 className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
//                                 value={formData.author_img}
//                                 placeholder="https://example.com/author-image.png"
//                             />
//                         </div>
//                     </div>

//                     <div>
//                         <label htmlFor="author_bio" className="block text-sm font-medium text-gray-700 mb-1">
//                             Author Bio
//                         </label>
//                         <textarea
//                             id="author_bio"
//                             name="author_bio"
//                             rows={3}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//                             value={formData.author_bio}
//                         />
//                     </div>

//                     <div>
//                         <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
//                             Content *
//                         </label>
//                         <textarea
//                             id="content"
//                             name="content"
//                             required
//                             rows={12}
//                             className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-serif text-gray-800 `}
//                             value={formData.content}
//                         />
//                     </div>

//                     {/* <div className="flex justify-between pt-6 border-t border-gray-200">
//                         <button
//                             type="button"
//                             onClick={onCancel}
//                             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
//                         >
//                             Cancel
//                         </button>


//                     </div> */}
//                 </div>
//             </div>
//         </div>
//     );
// }



type PostFormat = 'standard' | 'video' | 'audio' | 'gallery' | 'quote' | 'text';

interface PreviewDialogData {
  postFormat?: PostFormat;
  title?: string;
  excerpt?: string;
  content?: string;
  cate?: string;
  cate_bg?: string;
  cate_img?: string;
  tags?: string[];
  featureImg?: string;
  date?: string;
  post_views?: string;
  post_share?: string;
  author_name?: string;
  author_desg?: string;
  author_img?: string;
  author_bio?: string;
  author_social?: string[];
}

interface PreviewDialogProps {
  initialData?: PreviewDialogData;
  onCancel: () => void;
  isOpen: boolean;
}

interface PreviewDialogFormState {
  postFormat: PostFormat;
  title: string;
  excerpt: string;
  content: string;
  cate: string;
  cate_bg: string;
  cate_img: string;
  tags: string;
  featureImg: string;
  date: string;
  post_views: string;
  post_share: string;
  author_name: string;
  author_desg: string;
  author_img: string;
  author_bio: string;
  author_social: string[];
}

const DEFAULT_CATEGORY_IMAGE =
  '/openpress-quill-nobg-trim.png/cccccc/ffffff?text=Category';
const DEFAULT_FEATURE_IMAGE =
  '/openpress-share.png/cccccc/ffffff?text=Featured+Image';
const DEFAULT_AUTHOR_IMAGE =
  '/openpress-quill-nobg-trim.png/cccccc/ffffff?text=Author';

export default function PreviewDialog({
  initialData = {},
  onCancel,
  isOpen,
}: PreviewDialogProps) {
  const dialogData = useMemo(() => initialData, [initialData]);

  const [formData] = useState<PreviewDialogFormState>({
    postFormat: dialogData.postFormat ?? 'standard',
    title: dialogData.title ?? '',
    excerpt: dialogData.excerpt ?? '',
    content: dialogData.content ?? '',
    cate: dialogData.cate ?? '',
    cate_bg: dialogData.cate_bg ?? '',
    cate_img: dialogData.cate_img ?? DEFAULT_CATEGORY_IMAGE,
    tags: dialogData.tags ? dialogData.tags.join(', ') : '',
    featureImg: dialogData.featureImg ?? DEFAULT_FEATURE_IMAGE,
    date: dialogData.date ?? '',
    post_views: dialogData.post_views ?? '',
    post_share: dialogData.post_share ?? '',
    author_name: dialogData.author_name ?? '',
    author_desg: dialogData.author_desg ?? '',
    author_img: dialogData.author_img ?? DEFAULT_AUTHOR_IMAGE,
    author_bio: dialogData.author_bio ?? '',
    author_social: dialogData.author_social ?? [],
  });

  if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50">
            {/* BACKDROP */}
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />

            {/* MODAL */}
            <div className="absolute inset-0 flex justify-center items-start overflow-y-auto p-6">
                <div className="bg-white w-full max-w-4xl p-6 rounded-lg shadow-lg relative z-10">

                    <h1 className=' text-center '>Article</h1>

                    {/* The rest of your form here ... */}
                    {/* Keep the rest of the form as-is inside this div */}
                    <div className="space-y-6">


                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                    Title *
                                </label>
                                <input
                                    id="title"
                                    name="title"
                                    type="text"
                                    required
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
                                    value={formData.title}
                                />
                            </div>

                            <div>
                                <label htmlFor="postFormat" className="block text-sm font-medium text-gray-700 mb-1">
                                    Post Format
                                </label>
                                <select
                                    id="postFormat"
                                    name="postFormat"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={formData.postFormat}
                                >
                                    <option value="standard">Standard</option>
                                    <option value="video">Video</option>
                                    <option value="audio">Audio</option>
                                    <option value="gallery">Gallery</option>
                                    <option value="quote">Quote</option>
                                    <option value="text">Text</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
                                Excerpt *
                            </label>
                            <textarea
                                id="excerpt"
                                name="excerpt"
                                required
                                rows={3}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
                                value={formData.excerpt}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                            <div>
                                <label htmlFor="cate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Category *
                                </label>
                                <input
                                    id="cate"
                                    name="cate"
                                    type="text"
                                    required
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
                                    value={formData.cate}
                                />
                            </div>

                            <div>
                                <label htmlFor="cate_bg" className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Background
                                </label>
                                <input
                                    id="cate_bg"
                                    name="cate_bg"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={formData.cate_bg}
                                    placeholder="bg-color-purple-one"
                                />
                            </div>

                            <div>
                                <label htmlFor="cate_img" className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Image URL
                                </label>
                                <input
                                    id="cate_img"
                                    name="cate_img"
                                    type="url"
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
                                    value={formData.cate_img}
                                    placeholder="https://example.com/category-image.png"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                                    Tags (comma separated)
                                </label>
                                <input
                                    id="tags"
                                    name="tags"
                                    type="text"
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
                                    value={formData.tags}
                                    placeholder="Gaming, Adventure, Travel"
                                />
                            </div>

                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                                    Date
                                </label>
                                <input
                                    id="date"
                                    name="date"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={formData.date}
                                    placeholder="Jun 30 2020"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="post_views" className="block text-sm font-medium text-gray-700 mb-1">
                                    Post Views
                                </label>
                                <input
                                    id="post_views"
                                    name="post_views"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={formData.post_views}
                                    placeholder="2K Views"
                                />
                            </div>

                            <div>
                                <label htmlFor="post_share" className="block text-sm font-medium text-gray-700 mb-1">
                                    Post Shares
                                </label>
                                <input
                                    id="post_share"
                                    name="post_share"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={formData.post_share}
                                    placeholder="250 Shares"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="featureImg" className="block text-sm font-medium text-gray-700 mb-1">
                                Featured Image URL *
                            </label>
                            <input
                                id="featureImg"
                                name="featureImg"
                                type="url"
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
                                value={formData.featureImg}
                                placeholder="https://example.com/featured-image.jpg"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                            <div>
                                <label htmlFor="author_name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Author Name *
                                </label>
                                <input
                                    id="author_name"
                                    name="author_name"
                                    type="text"
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
                                    value={formData.author_name}
                                />
                            </div>

                            <div>
                                <label htmlFor="author_desg" className="block text-sm font-medium text-gray-700 mb-1">
                                    Author Designation
                                </label>
                                <input
                                    id="author_desg"
                                    name="author_desg"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={formData.author_desg}
                                />
                            </div>

                            <div>
                                <label htmlFor="author_img" className="block text-sm font-medium text-gray-700 mb-1">
                                    Author Image URL
                                </label>
                                <input
                                    id="author_img"
                                    name="author_img"
                                    type="url"
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 `}
                                    value={formData.author_img}
                                    placeholder="https://example.com/author-image.png"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="author_bio" className="block text-sm font-medium text-gray-700 mb-1">
                                Author Bio
                            </label>
                            <textarea
                                id="author_bio"
                                name="author_bio"
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                value={formData.author_bio}
                            />
                        </div>

                        <div>
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                                Content *
                            </label>
                            {/* Rendered HTML preview */}
                            <div className="mt-6 border-2 p-2">
                                {/* <h2 className="text-lg font-semibold text-gray-800 mb-2">Content Preview</h2> */}
                                <div
                                    className="prose max-w-none prose-sm prose-p:my-2 prose-li:my-1 prose-a:text-blue-600 prose-a:underline"
                                    dangerouslySetInnerHTML={{ __html: formData.content }}
                                />
                            </div>
                        </div>

                        {/* <div className="flex justify-between pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Cancel
                        </button>


                    </div> */}
                    </div>

                    <div className="flex justify-between pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
