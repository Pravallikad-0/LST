import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, User, FileText, Star, MessageSquare } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc, 
  getDoc,
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Appointment, Prescription, Feedback } from '../types';
import toast from 'react-hot-toast';

const PatientAppointments: React.FC = () => {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Record<string, Prescription>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, Feedback>>({});
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    comment: ''
  });
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!currentUser) return;

      try {
        const q = query(
          collection(db, 'appointments'),
          where('patientId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const appointmentsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        setAppointments(appointmentsList);

        // Fetch prescriptions for completed appointments
        const completedAppointments = appointmentsList.filter(apt => apt.status === 'completed');
        const prescriptionsData: Record<string, Prescription> = {};
        
        for (const appointment of completedAppointments) {
          const prescriptionQuery = query(
            collection(db, 'prescriptions'),
            where('appointmentId', '==', appointment.id)
          );
          const prescriptionSnapshot = await getDocs(prescriptionQuery);
          
          if (!prescriptionSnapshot.empty) {
            const prescriptionDoc = prescriptionSnapshot.docs[0];
            prescriptionsData[appointment.id] = {
              id: prescriptionDoc.id,
              ...prescriptionDoc.data()
            } as Prescription;
          }
        }
        setPrescriptions(prescriptionsData);

        // Fetch existing feedback
        const feedbacksData: Record<string, Feedback> = {};
        for (const appointment of completedAppointments) {
          const feedbackQuery = query(
            collection(db, 'feedback'),
            where('appointmentId', '==', appointment.id),
            where('patientId', '==', currentUser.uid)
          );
          const feedbackSnapshot = await getDocs(feedbackQuery);
          
          if (!feedbackSnapshot.empty) {
            const feedbackDoc = feedbackSnapshot.docs[0];
            feedbacksData[appointment.id] = {
              id: feedbackDoc.id,
              ...feedbackDoc.data()
            } as Feedback;
          }
        }
        setFeedbacks(feedbacksData);

      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmitFeedback = async (appointmentId: string, doctorId: string) => {
    if (!feedbackForm.rating) {
      toast.error('Please provide a rating');
      return;
    }

    if (feedbackForm.comment.length > 150) {
      toast.error('Comment must be 150 characters or less');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        appointmentId,
        patientId: currentUser!.uid,
        doctorId,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment || null,
        createdAt: Timestamp.now()
      });

      // Update local state
      setFeedbacks({
        ...feedbacks,
        [appointmentId]: {
          id: 'temp',
          appointmentId,
          patientId: currentUser!.uid,
          doctorId,
          rating: feedbackForm.rating,
          comment: feedbackForm.comment,
          createdAt: new Date()
        }
      });

      toast.success('Feedback submitted successfully!');
      setShowFeedbackModal(null);
      setFeedbackForm({ rating: 5, comment: '' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive && onRate ? () => onRate(star) : undefined}
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
        <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
        <p className="mt-2 text-gray-600">
          View and manage your appointment history
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
          <p className="mt-1 text-sm text-gray-500">
            You haven't booked any appointments yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900">
                        Dr. {appointment.doctorName || appointment.preferredDoctorName || 'To be assigned'}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(appointment.status)}`}>
                        {appointment.status.replace('-', ' ')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{appointment.date}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{appointment.time}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Health Concern:</p>
                          <p className="text-sm text-gray-600">{appointment.healthConcern}</p>
                        </div>
                      </div>
                    </div>

                    {/* Prescription Details */}
                    {appointment.status === 'completed' && prescriptions[appointment.id] && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Prescription:</h4>
                        <div className="space-y-2">
                          {prescriptions[appointment.id].medicines.map((medicine, index) => (
                            <div key={index} className="text-sm">
                              <p className="font-medium text-blue-800">{medicine.name}</p>
                              <p className="text-blue-700">Dosage: {medicine.dosage}</p>
                              <p className="text-blue-700">Frequency: {medicine.frequency}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feedback Section */}
                    {appointment.status === 'completed' && appointment.doctorId && (
                      <div className="mt-4">
                        {feedbacks[appointment.id] ? (
                          <div className="p-4 bg-green-50 rounded-lg">
                            <h4 className="text-sm font-medium text-green-900 mb-2">Your Feedback:</h4>
                            <div className="flex items-center space-x-2 mb-2">
                              {renderStars(feedbacks[appointment.id].rating)}
                              <span className="text-sm text-green-800">
                                ({feedbacks[appointment.id].rating}/5)
                              </span>
                            </div>
                            {feedbacks[appointment.id].comment && (
                              <p className="text-sm text-green-700">
                                "{feedbacks[appointment.id].comment}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowFeedbackModal(appointment.id)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>Leave Feedback</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Feedback</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  {renderStars(feedbackForm.rating, true, (rating) => 
                    setFeedbackForm({ ...feedbackForm, rating })
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment (Optional)
                  </label>
                  <textarea
                    value={feedbackForm.comment}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                    maxLength={150}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Share your experience..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {feedbackForm.comment.length}/150 characters
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    const appointment = appointments.find(apt => apt.id === showFeedbackModal);
                    if (appointment?.doctorId) {
                      handleSubmitFeedback(showFeedbackModal, appointment.doctorId);
                    }
                  }}
                  disabled={submittingFeedback}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
                <button
                  onClick={() => {
                    setShowFeedbackModal(null);
                    setFeedbackForm({ rating: 5, comment: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;