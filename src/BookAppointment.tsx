import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, User, FileText, Stethoscope, AlertCircle, UserPlus } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Doctor } from '../types';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const BookAppointment: React.FC = () => {
  const { currentUser } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [formData, setFormData] = useState({
    preferredDoctorId: '',
    date: '',
    time: '',
    healthConcern: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
        const querySnapshot = await getDocs(q);
        const doctorsList = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as Doctor[];
        
        console.log('Fetched doctors:', doctorsList); // Debug log
        setDoctors(doctorsList);
        
        if (doctorsList.length === 0) {
          console.log('No doctors found in the system');
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        toast.error('Failed to load doctors');
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, []);

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.preferredDoctorId || !formData.date || !formData.time || !formData.healthConcern) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.healthConcern.length > 200) {
      toast.error('Health concern must be 200 characters or less');
      return;
    }

    // Check if user already has 2 appointments on the same day
    const appointmentDate = new Date(formData.date);
    const startOfDay = Timestamp.fromDate(new Date(appointmentDate.setHours(0, 0, 0, 0)));
    const endOfDay = Timestamp.fromDate(new Date(appointmentDate.setHours(23, 59, 59, 999)));

    const existingAppointmentsQuery = query(
      collection(db, 'appointments'),
      where('patientId', '==', currentUser!.uid),
      where('createdAt', '>=', startOfDay),
      where('createdAt', '<=', endOfDay)
    );

    const existingAppointments = await getDocs(existingAppointmentsQuery);
    
    if (existingAppointments.size >= 2) {
      toast.error('You cannot book more than 2 appointments on the same day');
      return;
    }

    setLoading(true);
    try {
      const selectedDoctor = doctors.find(doc => doc.uid === formData.preferredDoctorId);
      
      await addDoc(collection(db, 'appointments'), {
        patientId: currentUser!.uid,
        patientName: currentUser!.name,
        preferredDoctorId: formData.preferredDoctorId,
        preferredDoctorName: selectedDoctor?.name,
        date: formData.date,
        time: formData.time,
        healthConcern: formData.healthConcern,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast.success('Appointment booked successfully!');
      setFormData({
        preferredDoctorId: '',
        date: '',
        time: '',
        healthConcern: ''
      });
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const timeSlots = generateTimeSlots();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Book an Appointment</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Schedule your consultation with one of our experienced doctors. We're here to provide you with the best healthcare.
          </p>
        </div>

        {/* No Doctors Available Message */}
        {!loadingDoctors && doctors.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Doctors Available</h3>
              <p className="text-gray-600 mb-6">
                Currently, there are no doctors registered in the system. To book an appointment, we need doctors to be available.
              </p>
              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-3">For Testing Purposes:</h4>
                <p className="text-blue-800 mb-4">
                  You can create a doctor account to test the appointment booking system:
                </p>
                <div className="space-y-2 text-sm text-blue-700">
                  <p><strong>1.</strong> Log out of your current account</p>
                  <p><strong>2.</strong> Go to the registration page</p>
                  <p><strong>3.</strong> Create a new account with role "Doctor"</p>
                  <p><strong>4.</strong> Use an email like: doctor@meditrack.local</p>
                  <p><strong>5.</strong> Log back into your patient account to book appointments</p>
                </div>
              </div>
              <Link
                to="/register"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                <UserPlus className="h-5 w-5" />
                <span>Create Doctor Account</span>
              </Link>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h2 className="text-2xl font-semibold text-white">Appointment Details</h2>
            <p className="text-blue-100 mt-1">Please fill in all the required information</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Doctor Selection */}
            <div className="space-y-2">
              <label htmlFor="preferredDoctorId" className="block text-sm font-semibold text-gray-700 mb-3">
                Select Your Doctor
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Stethoscope className="h-5 w-5 text-gray-400" />
                </div>
                {loadingDoctors ? (
                  <div className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-gray-500">Loading doctors...</span>
                    </div>
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="block w-full pl-12 pr-4 py-4 border-2 border-red-200 rounded-xl bg-red-50">
                    <span className="text-red-600">No doctors available. Please contact administrator.</span>
                  </div>
                ) : (
                  <select
                    id="preferredDoctorId"
                    name="preferredDoctorId"
                    value={formData.preferredDoctorId}
                    onChange={handleInputChange}
                    className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300"
                    required
                    disabled={doctors.length === 0}
                  >
                    <option value="">Choose a doctor from our team</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.uid} value={doctor.uid}>
                        Dr. {doctor.name} {doctor.specialization ? `- ${doctor.specialization}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {!loadingDoctors && doctors.length > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  {doctors.length} doctor{doctors.length > 1 ? 's' : ''} available
                </p>
              )}
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Selection */}
              <div className="space-y-2">
                <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-3">
                  Appointment Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    min={today}
                    value={formData.date}
                    onChange={handleInputChange}
                    className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300"
                    required
                    disabled={doctors.length === 0}
                  />
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <label htmlFor="time" className="block text-sm font-semibold text-gray-700 mb-3">
                  Preferred Time
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300"
                    required
                    disabled={doctors.length === 0}
                  >
                    <option value="">Select appointment time</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Health Concern */}
            <div className="space-y-2">
              <label htmlFor="healthConcern" className="block text-sm font-semibold text-gray-700 mb-3">
                Health Concern
              </label>
              <div className="relative">
                <div className="absolute top-4 left-0 pl-4 flex items-start pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  id="healthConcern"
                  name="healthConcern"
                  rows={4}
                  maxLength={200}
                  value={formData.healthConcern}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300 resize-none"
                  placeholder="Please describe your symptoms or reason for the appointment. This helps our doctors prepare for your consultation."
                  required
                  disabled={doctors.length === 0}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">
                  Be as specific as possible to help us serve you better
                </p>
                <p className="text-sm text-gray-500">
                  {formData.healthConcern.length}/200 characters
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading || loadingDoctors || doctors.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Booking Your Appointment...</span>
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="flex items-center justify-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>No Doctors Available</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Book Appointment</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Flexible Hours</h3>
            </div>
            <p className="text-gray-600 text-sm">Available from 9:00 AM to 5:00 PM, Monday through Friday</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Expert Care</h3>
            </div>
            <p className="text-gray-600 text-sm">Our qualified doctors provide personalized healthcare solutions</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Easy Process</h3>
            </div>
            <p className="text-gray-600 text-sm">Simple booking process with instant confirmation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;