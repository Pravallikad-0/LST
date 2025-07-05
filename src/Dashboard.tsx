import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  Users, 
  Activity,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Star,
  ArrowRight,
  Plus
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Appointment, Feedback } from '../types';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    averageRating: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) return;

      try {
        let appointmentsQuery;
        
        if (currentUser.role === 'patient') {
          appointmentsQuery = query(
            collection(db, 'appointments'),
            where('patientId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          appointmentsQuery = query(
            collection(db, 'appointments'),
            where('doctorId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        }

        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointments = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        setRecentAppointments(appointments.slice(0, 5));

        const totalAppointments = appointments.length;
        const pendingAppointments = appointments.filter(apt => apt.status === 'pending').length;
        const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;

        let averageRating = 0;
        if (currentUser.role === 'doctor' && completedAppointments > 0) {
          const feedbackQuery = query(
            collection(db, 'feedback'),
            where('doctorId', '==', currentUser.uid)
          );
          const feedbackSnapshot = await getDocs(feedbackQuery);
          const feedbacks = feedbackSnapshot.docs.map(doc => doc.data()) as Feedback[];
          
          if (feedbacks.length > 0) {
            const totalRating = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
            averageRating = totalRating / feedbacks.length;
          }
        }

        setStats({
          totalAppointments,
          pendingAppointments,
          completedAppointments,
          averageRating
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {currentUser?.name}! 👋
                </h1>
                <p className="text-blue-100 text-lg">
                  {currentUser?.role === 'patient' 
                    ? 'Manage your health appointments and track your medical journey'
                    : 'Manage your practice and provide excellent patient care'
                  }
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <Activity className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalAppointments}</p>
                <p className="text-sm text-green-600 mt-1">All time</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingAppointments}</p>
                <p className="text-sm text-yellow-600 mt-1">Awaiting action</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completedAppointments}</p>
                <p className="text-sm text-green-600 mt-1">Successfully finished</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {currentUser?.role === 'doctor' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Average Rating</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-sm text-yellow-600 mt-1">Patient feedback</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {currentUser?.role === 'patient' ? (
            <>
              <Link
                to="/book-appointment"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Book New Appointment</h3>
                    <p className="text-blue-100">Schedule a consultation with our doctors</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Plus className="h-6 w-6" />
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>
              <Link
                to="/appointments"
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">View My Appointments</h3>
                    <p className="text-gray-600">Check status and manage your bookings</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/pending-appointments"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Review Pending Appointments</h3>
                    <p className="text-yellow-100">Accept new patient requests</p>
                  </div>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </Link>
              <Link
                to="/my-appointments"
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">My Appointments</h3>
                    <p className="text-gray-600">Manage confirmed patient appointments</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            </>
          )}
        </div>

        {/* Recent Appointments */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Appointments</h2>
              <Link
                to={currentUser?.role === 'patient' ? '/appointments' : '/my-appointments'}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentAppointments.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
                <p className="text-gray-500 mb-6">
                  {currentUser?.role === 'patient' 
                    ? 'You haven\'t booked any appointments yet. Start by scheduling your first consultation.'
                    : 'You don\'t have any appointments assigned yet. Check pending appointments to accept new requests.'
                  }
                </p>
                <Link
                  to={currentUser?.role === 'patient' ? '/book-appointment' : '/pending-appointments'}
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {currentUser?.role === 'patient' ? 'Book Appointment' : 'View Pending'}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {currentUser?.role === 'patient' 
                              ? appointment.doctorName || appointment.preferredDoctorName || 'Doctor TBD'
                              : appointment.patientName
                            }
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.date} at {appointment.time}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 ml-13">{appointment.healthConcern}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace('-', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;