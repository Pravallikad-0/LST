import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, UserCheck, Calendar, Star, TrendingUp } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Appointment, Feedback } from '../types';

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    averageRating: 0,
    totalFeedbacks: 0
  });
  const [recentFeedbacks, setRecentFeedbacks] = useState<(Feedback & { patientName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!currentUser) return;

      try {
        let appointmentsQuery;
        
        if (currentUser.role === 'patient') {
          appointmentsQuery = query(
            collection(db, 'appointments'),
            where('patientId', '==', currentUser.uid)
          );
        } else {
          appointmentsQuery = query(
            collection(db, 'appointments'),
            where('doctorId', '==', currentUser.uid)
          );
        }

        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointments = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        const totalAppointments = appointments.length;
        const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;

        let averageRating = 0;
        let totalFeedbacks = 0;
        let feedbacksWithNames: (Feedback & { patientName: string })[] = [];

        if (currentUser.role === 'doctor') {
          const feedbackQuery = query(
            collection(db, 'feedback'),
            where('doctorId', '==', currentUser.uid)
          );
          const feedbackSnapshot = await getDocs(feedbackQuery);
          const feedbacks = feedbackSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Feedback[];

          totalFeedbacks = feedbacks.length;
          
          if (feedbacks.length > 0) {
            const totalRating = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
            averageRating = totalRating / feedbacks.length;

            // Get patient names for recent feedbacks
            feedbacksWithNames = await Promise.all(
              feedbacks.slice(0, 5).map(async (feedback) => {
                const appointment = appointments.find(apt => apt.id === feedback.appointmentId);
                return {
                  ...feedback,
                  patientName: appointment?.patientName || 'Unknown Patient'
                };
              })
            );
          }
        }

        setStats({
          totalAppointments,
          completedAppointments,
          averageRating,
          totalFeedbacks
        });

        setRecentFeedbacks(feedbacksWithNames);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [currentUser]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">
          Manage your account information and view your activity
        </p>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">Full Name</p>
              <p className="text-lg text-gray-900">{currentUser?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">Email Address</p>
              <p className="text-lg text-gray-900">{currentUser?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <UserCheck className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">Role</p>
              <p className="text-lg text-gray-900 capitalize">{currentUser?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedAppointments}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        {currentUser?.role === 'doctor' && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Feedbacks</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFeedbacks}</p>
                </div>
                <User className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Feedback (Doctor Only) */}
      {currentUser?.role === 'doctor' && recentFeedbacks.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Patient Feedback</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentFeedbacks.map((feedback) => (
                <div key={feedback.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="font-medium text-gray-900">{feedback.patientName}</p>
                        {renderStars(feedback.rating)}
                        <span className="text-sm text-gray-600">({feedback.rating}/5)</span>
                      </div>
                      {feedback.comment && (
                        <p className="text-gray-700 italic">"{feedback.comment}"</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(feedback.createdAt.seconds * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;