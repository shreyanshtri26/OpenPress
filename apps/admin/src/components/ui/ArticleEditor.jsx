import { Suspense, useState, lazy } from 'react';
const ReactQuill = lazy(() => import('react-quill'));
import { Loader2, Send, Save, CheckCircle, X } from 'lucide-react';
import { z } from 'zod';


const articleSchema = z.object({
  postFormat: z.enum(['standard', 'video', 'audio', 'gallery', 'quote', 'text']),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  excerpt: z.string().min(10, 'Excerpt should be more detailed'),
  // content: z.string().optional(),
  content: z.string().refine(
    (val) => val.replace(/<[^>]+>/g, '').trim().length >= 100,
    { message: 'Content should have at least 100 characters' }
  ),
  cate: z.string().min(2, 'Category is required'),
  cate_bg: z.string().optional(),
  cate_img: z.string().url('Must be a valid image URL').optional(),
  tags: z
    .string()
    .optional()
    .transform((val) =>
      val?.split(',').map((tag) => tag.trim()).filter(Boolean)
    ),
  featureImg: z.string().url('Must be a valid featured image URL'),
  date: z.string().optional(),
  post_views: z.string().optional(),
  post_share: z.string().optional(),
  author_email: z.string().optional(),
  author_name: z.string().min(2, 'Author name is required'),
  author_desg: z.string().optional(),
  author_img: z.string().url('Must be a valid image URL').optional(),
  author_bio: z.string().optional(),
  author_social: z.array(z.any()).optional(), // You can refine this structure
  status: z.enum(['draft', 'published']),
});

export default function ArticleEditor({
  initialData = {},
  onSave,
  onCancel,
  isSubmitting = false,
}) {
  const email = localStorage.getItem('email');
  const [formData, setFormData] = useState({
    postFormat: initialData.postFormat || 'standard',
    title: initialData.title || '',
    excerpt: initialData.excerpt || '',
    content: initialData.content || '',
    cate: initialData.cate || '',
    cate_bg: initialData.cate_bg || '',
    cate_img:
      initialData.cate_img ||
      'https://via.placeholder.com/150x150/cccccc/ffffff?text=Category',
    tags: initialData.tags ? initialData.tags.join(', ') : '',
    featureImg:
      initialData.featureImg ||
      'https://via.placeholder.com/800x400/cccccc/ffffff?text=Featured+Image',
    date: initialData.date || '',
    post_views: initialData.post_views || '',
    post_share: initialData.post_share || '',
    author_email: email || '',
    author_name: initialData.author_name || '',
    author_desg: initialData.author_desg || '',
    author_img:
      initialData.author_img ||
      'https://via.placeholder.com/150x150/cccccc/ffffff?text=Author',
    author_bio: initialData.author_bio || '',
    author_social: initialData.author_social || [],
  });


  const toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ header: [1, 2, 3, false] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ direction: 'rtl' }],
    [{ size: ['small', false, 'large', 'huge'] }],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ color: [] }, { background: [] }],
    [{ font: [] }],
    [{ align: [] }],
    ['link', 'image', 'video'],
    ['clean'],
  ];



  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const formatZodErrors = (zodError) => {
    console.log('zodError>>', zodError);

    const formatted = {};

    // Check if zodError has issues property (newer Zod versions) or if it's an array directly
    const errors = zodError.issues || zodError.errors || zodError;

    // Handle case where errors might be the array directly
    const errorArray = Array.isArray(errors) ? errors : [];

    errorArray.forEach((err) => {
      const field = err.path && err.path[0]; // e.g., "title", "excerpt"
      if (field) {
        formatted[field] = err.message;
      }
    });

    return formatted;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
    // Clear global messages on any change
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (status) => {
    setFormErrors({});
    setSuccessMessage('');
    setErrorMessage('');

    const toEmptyStringIfMissing = (val) => {
      if (typeof val === 'string') return val.trim();
      if (Array.isArray(val)) return val;
      return val ?? '';
    };

    const dataToSend = {
      postFormat: formData.postFormat,
      title: toEmptyStringIfMissing(formData.title),
      excerpt: toEmptyStringIfMissing(formData.excerpt),
      content: toEmptyStringIfMissing(formData.content),
      cate: toEmptyStringIfMissing(formData.cate),
      cate_bg: toEmptyStringIfMissing(formData.cate_bg),
      cate_img: toEmptyStringIfMissing(formData.cate_img),
      tags: formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean).join(',')
        : '',
      featureImg: toEmptyStringIfMissing(formData.featureImg),
      date: toEmptyStringIfMissing(formData.date),
      post_views: toEmptyStringIfMissing(formData.post_views),
      post_share: toEmptyStringIfMissing(formData.post_share),
      author_email: email,
      author_name: toEmptyStringIfMissing(formData.author_name),
      author_desg: toEmptyStringIfMissing(formData.author_desg),
      author_img: toEmptyStringIfMissing(formData.author_img),
      author_bio: toEmptyStringIfMissing(formData.author_bio),
      author_social: Array.isArray(formData.author_social) ? formData.author_social : [],
      status,
    };

    try {
      const validatedData = articleSchema.parse(dataToSend);
      await onSave?.(validatedData);
      setSuccessMessage('Article saved successfully!');
      // onCancel();
    } catch (error) {
      console.log('error>>', error);

      if (error instanceof z.ZodError) {
        const formattedErrors = formatZodErrors(error);
        setFormErrors(formattedErrors);

        // Scroll to first error field
        const firstErrorField = Object.keys(formattedErrors)[0];
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.focus();
          }
        }
      } else {
        setErrorMessage('An unexpected error occurred while saving the article.');
        console.error('Error saving article:', error);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {initialData._id ? 'Edit Article' : 'Create New Article'}
          </h1>
          <p className="text-gray-600 mt-2">
            {initialData._id
              ? 'Make changes to your article below'
              : 'Fill out the details below to create your new post'}
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 rounded-md bg-green-100 text-green-800 flex items-center">
            <CheckCircle className="mr-2" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 rounded-md bg-red-100 text-red-800 flex items-center">
            <X className="mr-2" />
            {errorMessage}
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="title"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${formErrors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                value={formData.title}
                onChange={handleChange}
              />
              {formErrors.title && (
                <p className="text-xl text-red-600 mt-1">{formErrors.title}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="postFormat"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Post Format
              </label>
              <select
                id="postFormat"
                name="postFormat"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={formData.postFormat}
                onChange={handleChange}
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
            <label
              htmlFor="excerpt"
              className="block text-xl font-medium text-gray-700 mb-1"
            >
              Excerpt *
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              required
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${formErrors.excerpt ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              value={formData.excerpt}
              onChange={handleChange}
            />
            {formErrors.excerpt && (
              <p className="text-xl text-red-600 mt-1">{formErrors.excerpt}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label
                htmlFor="cate"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Category *
              </label>
              <input
                id="cate"
                name="cate"
                type="text"
                required
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${formErrors.cate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                value={formData.cate}
                onChange={handleChange}
              />
              {formErrors.cate && (
                <p className="text-xl text-red-600 mt-1">{formErrors.cate}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="cate_bg"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Category Background
              </label>
              <input
                id="cate_bg"
                name="cate_bg"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={formData.cate_bg}
                onChange={handleChange}
                placeholder="bg-color-purple-one"
              />
            </div>

            <div>
              <label
                htmlFor="cate_img"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Category Image URL
              </label>
              <input
                id="cate_img"
                name="cate_img"
                type="url"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${formErrors.cate_img ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                value={formData.cate_img}
                onChange={handleChange}
                placeholder="https://example.com/category-image.png"
              />
              {formErrors.cate_img && (
                <p className="text-xl text-red-600 mt-1">{formErrors.cate_img}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tags"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Tags (comma separated)
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${formErrors.tags ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                value={formData.tags}
                onChange={handleChange}
                placeholder="Gaming, Adventure, Travel"
              />
              {formErrors.tags && (
                <p className="text-xl text-red-600 mt-1">{formErrors.tags}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="date"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Date
              </label>
              <input
                id="date"
                name="date"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={formData.date}
                onChange={handleChange}
                placeholder="Jun 30 2020"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="post_views"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Post Views
              </label>
              <input
                id="post_views"
                name="post_views"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={formData.post_views}
                onChange={handleChange}
                placeholder="2K Views"
              />
            </div>

            <div>
              <label
                htmlFor="post_share"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Post Shares
              </label>
              <input
                id="post_share"
                name="post_share"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={formData.post_share}
                onChange={handleChange}
                placeholder="250 Shares"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="featureImg"
              className="block text-xl font-medium text-gray-700 mb-1"
            >
              Featured Image URL *
            </label>
            <input
              id="featureImg"
              name="featureImg"
              type="url"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${formErrors.featureImg ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              value={formData.featureImg}
              onChange={handleChange}
              placeholder="https://example.com/featured-image.jpg"
            />
            {formErrors.featureImg && (
              <p className="text-xl text-red-600 mt-1">{formErrors.featureImg}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label
                htmlFor="author_name"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Author Name *
              </label>
              <input
                id="author_name"
                name="author_name"
                type="text"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${formErrors.author_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                value={formData.author_name}
                onChange={handleChange}
              />
              {formErrors.author_name && (
                <p className="text-xl text-red-600 mt-1">{formErrors.author_name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="author_desg"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Author Designation
              </label>
              <input
                id="author_desg"
                name="author_desg"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={formData.author_desg}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="author_img"
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Author Image URL
              </label>
              <input
                id="author_img"
                name="author_img"
                type="url"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${formErrors.author_img ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                value={formData.author_img}
                onChange={handleChange}
                placeholder="https://example.com/author-image.png"
              />
              {formErrors.author_img && (
                <p className="text-xl text-red-600 mt-1">{formErrors.author_img}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="author_bio"
              className="block text-xl font-medium text-gray-700 mb-1"
            >
              Author Bio
            </label>
            <textarea
              id="author_bio"
              name="author_bio"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.author_bio}
              onChange={handleChange}
            />
          </div>



          <div>
            <label
              htmlFor="content"
              className="block text-xl font-medium text-gray-700 mb-1"
            >
              Content *
            </label>

            {/* 🛠️ Separate Toolbar */}
            <div id="custom-toolbar" className="border border-gray-300 rounded-md p-2 mb-2 bg-white flex flex-wrap gap-2">
              {/* Text styles */}
              <button className="ql-bold" />
              <button className="ql-italic" />
              <button className="ql-underline" />
              <button className="ql-strike" />

              {/* Block styles */}
              <button className="ql-blockquote" />
              <button className="ql-code-block" />

              {/* Headers */}
              <select className="ql-header" defaultValue="">
                <option value="1" />
                <option value="2" />
                <option value="3" />
                <option value="" />
              </select>

              {/* Lists */}
              <button className="ql-list" value="ordered" />
              <button className="ql-list" value="bullet" />

              {/* Scripts */}
              <button className="ql-script" value="sub" />
              <button className="ql-script" value="super" />

              {/* Indents */}
              <button className="ql-indent" value="-1" />
              <button className="ql-indent" value="+1" />

              {/* Direction */}
              <button className="ql-direction" value="rtl" />

              {/* Size */}
              <select className="ql-size" defaultValue="">
                <option value="small" />
                <option value="" />
                <option value="large" />
                <option value="huge" />
              </select>

              {/* Header sizes (redundant, but if you want to include both dropdowns) */}
              <select className="ql-header" defaultValue="">
                <option value="1" />
                <option value="2" />
                <option value="3" />
                <option value="4" />
                <option value="5" />
                <option value="6" />
                <option value="" />
              </select>

              {/* Colors */}
              <select className="ql-color" />
              <select className="ql-background" />

              {/* Fonts */}
              <select className="ql-font" />

              {/* Align */}
              <select className="ql-align" />

              {/* Media */}
              <button className="ql-link" />
              <button className="ql-image" />
              <button className="ql-video" />

              {/* Clear formatting */}
              <button className="ql-clean" />
            </div>


            {/* 📝 Editor Area */}
            <div
              className={`rounded-md shadow-sm ${formErrors.content ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              style={{ height: '500px', overflowY: 'auto', position: 'relative' }}
            >
              <Suspense fallback={<div className="p-4 text-center">Loading editor...</div>}>
                <ReactQuill
                  value={formData.content}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, content: value }));
                    if (formErrors.content) setFormErrors((prev) => ({ ...prev, content: undefined }));
                    if (successMessage) setSuccessMessage('');
                    if (errorMessage) setErrorMessage('');
                  }}
                  modules={{ toolbar: '#custom-toolbar' }}
                  theme="snow"
                  className="h-[500px]" // Adjust height to leave room for the separate toolbar
                />
              </Suspense>
            </div>

            {formErrors.content && (
              <p className="text-xl text-red-600 mt-1">{formErrors.content}</p>
            )}
          </div>

          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 text-xl font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <div className="space-x-3">
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-3 text-xl font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('published')}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 text-xl font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
