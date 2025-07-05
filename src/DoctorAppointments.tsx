import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  ArrowRight, 
  CheckCircle, 
  Plus,
  Pill 
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Appointment, Prescription } from '../types';
import toast from 'react-hot-toast';

const DoctorAppointments: React.FC = () => {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Record<string, Prescription>>({});
  const [showPrescriptionModal, setShowPrescriptionModal] = useState<string | null>(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicines: [{ name: '', dosage: '', frequency: '' }]
  });
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [submittingPrescription, setSubmittingPrescription] = useState(false);

  useEffect(() => {
    const fetchMyAppointments = async () => {
      if (!currentUser) return;

      try {
        const q = query(
          collection(db, 'appointments'),
          where('doctorId', '==', currentUser.uid),
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

      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchMyAppointments();
  }, [currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'confirmed':
        return 'in-progress';
      case 'in-progress':
        return 'completed';
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'Start Appointment';
      case 'completed':
        return 'Complete Appointment';
      default:
        return null;
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    setUpdatingStatus(appointmentId);
    
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      // Update local state
      setAppointments(appointments.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: newStatus as any }
          : apt
      ));

      toast.success(`Appointment ${newStatus.replace('-', ' ')} successfully!`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAddMedicine = () => {
    setPrescriptionForm({
      medicines: [...prescriptionForm.medicines, { name: '', dosage: '', frequency: '' }]
    });
  };

  const handleRemoveMedicine = (index: number) => {
    if (prescriptionForm.medicines.length > 1) {
      const newMedicines = prescriptionForm.medicines.filter((_, i) => i !== index);
      setPrescriptionForm({ medicines: newMedicines });
    }
  };

  const handleMedicineChange = (index: number, field: string, value: string) => {
    const newMedicines = prescriptionForm.medicines.map((medicine, i) => 
      i === index ? { ...medicine, [field]: value } : medicine
    );
    setPrescriptionForm({ medicines: newMedicines });
  };

  const handleSubmitPrescription = async (appointmentId: string) => {
    if (prescriptionForm.medicines.some(med => !med.name || !med.dosage || !med.frequency)) {
      toast.error('Please fill in all medicine fields');
      return;
    }

    setSubmittingPrescription(true);
    try {
      const prescriptionData = {
        appointmentId,
        medicines: prescriptionForm.medicines,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'prescriptions'), prescriptionData);
      
      // Update local state
      setPrescriptions({
        ...prescriptions,
        [appointmentId]: {
          id: docRef.id,
          ...prescriptionData
        } as Prescription
      });

      toast.success('Prescription added successfully!');
      setShowPrescriptionModal(null);
      setPrescriptionForm({ medicines: [{ name: '', dosage: '', frequency: '' }] });
    } catch (error) {
      console.error('Error adding prescription:', error);
      toast.error('Failed to add prescription');
    } finally {
      setSubmittingPrescription(false);
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
        <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
        <p className="mt-2 text-gray-600">
          Manage your confirmed appointments and patient care
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any confirmed appointments yet.
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
                  </div>

                  <div className="ml-4 flex flex-col space-y-2">
                    {/* Status Update Button */}
                    {getNextStatus(appointment.status) && (
                      <button
                        onClick={() => handleStatusUpdate(appointment.id, getNextStatus(appointment.status)!)}
                        disabled={updatingStatus === appointment.id}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {getNextStatus(appointment.status) === 'completed' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                        <span>
                          {updatingStatus === appointment.id 
                            ? 'Updating...' 
                            : getStatusLabel(getNextStatus(appointment.status)!)
                          }
                        </span>
                      </button>
                    )}

                    {/* Add Prescription Button */}
                    {appointment.status === 'completed' && !prescriptions[appointment.id] && (
                      <button
                        onClick={() => setShowPrescriptionModal(appointment.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                      >
                        <Pill className="h-4 w-4" />
                        <span>Add Prescription</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Prescription</h3>
              
              <div className="space-y-4">
                {prescriptionForm.medicines.map((medicine, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Medicine {index + 1}
                      </h4>
                      {prescriptionForm.medicines.length > 1 && (
                        <button
                          onClick={() => handleRemoveMedicine(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          value={medicine.name}
                          onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Paracetamol"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dosage
                        </label>
                        <input
                          type="text"
                          value={medicine.dosage}
                          onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 500mg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <input
                          type="text"
                          value={medicine.frequency}
                          onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 3 times daily"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddMedicine}
                  className="flex items-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Another Medicine</span>
                </button>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handleSubmitPrescription(showPrescriptionModal)}
                  disabled={submittingPrescription}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingPrescription ? 'Adding...' : 'Add Prescription'}
                </button>
                <button
                  onClick={() => {
                    setShowPrescriptionModal(null);
                    setPrescriptionForm({ medicines: [{ name: '', dosage: '', frequency: '' }] });
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

export default DoctorAppointments;