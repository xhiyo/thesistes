import { collection, collectionGroup, getDocs, getDoc, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

export const getAllProjects = async (userEmail) => {
  if (!userEmail) return [];
  
  try {
    const q = collection(db, 'users', userEmail, 'projects');
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

export const getProjectById = async (id, ownerEmail = null) => {
  try {
    if (ownerEmail) {
      const docRef = doc(db, 'users', ownerEmail, 'projects', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    }

    const q = query(collectionGroup(db, 'projects'), where('id', '==', id));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching project: ", error);
    return null;
  }
};

export const saveProject = async (project) => {
  try {
    const docRef = doc(db, 'users', project.ownerEmail, 'projects', project.id);
    await setDoc(docRef, project);
  } catch (error) {
    console.error("Error saving project: ", error);
    throw error;
  }
};

export const deleteProject = async (id, ownerEmail) => {
  if (!ownerEmail) {
    console.error("Owner email is required to delete a project");
    return;
  }
  try {
    const docRef = doc(db, 'users', ownerEmail, 'projects', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting project: ", error);
    throw error;
  }
};
