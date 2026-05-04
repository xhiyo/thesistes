import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'projects';

export const getAllProjects = async (userEmail) => {
  if (!userEmail) return [];
  
  try {
    const q = query(collection(db, COLLECTION_NAME), where("ownerEmail", "==", userEmail));
    const querySnapshot = await getDocs(q);
    const projects = [];
    querySnapshot.forEach((docSnap) => {
      projects.push(docSnap.data());
    });
    return projects;
  } catch (error) {
    console.error("Error fetching projects: ", error);
    return [];
  }
};

export const getProjectById = async (id) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching project: ", error);
    return null;
  }
};

export const saveProject = async (project) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, project.id);
    await setDoc(docRef, project);
  } catch (error) {
    console.error("Error saving project: ", error);
    throw error;
  }
};

export const deleteProject = async (id) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting project: ", error);
    throw error;
  }
};


