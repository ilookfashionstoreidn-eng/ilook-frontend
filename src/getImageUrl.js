
const getImageUrl = (filename) => {
    if (!filename) return ''; // Jika tidak ada nama file, kembalikan string kosong
  
    // Anggap path di database adalah relatif, seperti 'images/1746442370_png 3.png'
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '/storage');
    
    return `${baseUrl}/${filename}`; // Gabungkan base URL dengan path relatif
  };
  
  
  
  export default getImageUrl;