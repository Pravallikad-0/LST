import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, User, FileText, Check } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Appointment } from '../types';
import toast from 'react-hot-toast';

const PendingAppointments: React.FC = () => {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingAppointment, setAcceptingAppointment] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingAppointments = async () => {
      try {
        const q = query(
          collection(db, 'appointments'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const appointmentsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        setAppointments(appointmentsList);
      } catch (error) {
        console.error('Error fetching pending appointments:', error);
        toast.error('Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingAppointments();
  }, []);

  const handleAcceptAppointment = async (appointmentId: string) => {
    setAcceptingAppointment(appointmentId);
    
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: 'confirmed',
        doctorId: currentUser!.uid,
        doctorName: currentUser!.name,
        updatedAt: Timestamp.now()
      });

      // Remove the appointment from the list
      setAppointments(appointments.filter(apt => apt.id !== appointmentId));
      toast.success('Appointment accepted successfully!');
    } catch (error) {
      console.error('Error accepting appointment:', error);
      toast.error('Failed to accept appointment');
    } finally {
      setAcceptingAppointment(null);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Pending Appointments</h1>
        <p className="mt-2 text-gray-600">
          Review and accept appointment requests from patients
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending appointments</h3>
          <p className="mt-1 text-sm text-gray-500">
            All appointment requests have been processed.
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
                        {appointment.patientName}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
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

                    <div className="text-xs text-gray-500">
                      Requested on: {new Date(appointment.createdAt.seconds * 1000).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={() => handleAcceptAppointment(appointment.id)}
                      disabled={acceptingAppointment === appointment.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      <span>
                        {acceptingAppointment === appointment.id ? 'Accepting...' : 'Accept'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingAppointments;