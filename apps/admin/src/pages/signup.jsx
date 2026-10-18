import { useState, useContext } from 'react';
import { useRouter } from '@/hooks/useRouter';
import apiFetch from '../utils/api';
import { Eye, EyeOff } from 'lucide-react';
import { UserContext } from '../context/UserContext';
import Link from '@/components/common/Link';
import env from '@/utils/env';

export default function SignupPage() {
  const router = useRouter();
  const { login } = useContext(UserContext);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('reader');
  const [showPassword, setShowPassword] = useState(false);
  const API = env.apiUrl;



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const res = await apiFetch(`${env.backendApi}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, mobile, password, role: "journalist" }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Signup successful!');
        router.push('/login');
      } else {
        alert(data.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="flex-1 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-12 text-white">
        <div className="max-w-md">
          <div className="mb-8">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4">
              <img src="/openpress-quill-nobg-trim.png" alt="" className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold">OpenPress</h1>
            <p className="text-blue-100 mt-2">Your personalized media and analytics hub</p>
          </div>

          <div className="border-l-4 border-white border-opacity-30 pl-4">
            <p className="text-blue-100 italic">
              "Join the platform designed for media enthusiasts and readers."
            </p>
          </div>
        </div>
      </div>
      {/* Right side - Signup Form */}
      <div className="flex-1 bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-xl bg-white rounded-lg shadow-lg p-8">
          <div className="flex mb-6 w-fit mx-auto">
            <Link href="/login" legacyBehavior>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-l-md hover:bg-gray-300 transition-colors">
                Login
              </button>
            </Link>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-r-md">
              Sign Up
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Create your OpenPress account</h2>
          <p className="text-center text-gray-600 mb-6">Start your journey with us</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <div
                  className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign Up
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?
            <Link href="/login" className="text-blue-600 hover:text-blue-500 ml-1">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
