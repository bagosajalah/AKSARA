"""
Utility untuk enkripsi API Key menggunakan Fernet (symmetric encryption)
"""

from cryptography.fernet import Fernet
import os
import base64

# Ambil ENCRYPTION_KEY dari environment, atau generate sendiri
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "rahasia1234567890")

# Pastikan key length 32 bytes untuk Fernet
def get_cipher():
    """Get Fernet cipher instance"""
    # Fernet requires 32 url-safe base64-encoded bytes
    key = ENCRYPTION_KEY.encode()
    if len(key) < 32:
        # Pad jika kurang dari 32
        key = key.ljust(32, b'0')
    # Encode ke base64 untuk Fernet
    key_b64 = base64.urlsafe_b64encode(key[:32])
    return Fernet(key_b64)


def encrypt_api_key(plain: str) -> str:
    """
    Enkripsi API Key sebelum disimpan ke database
    
    Args:
        plain: API Key plaintext
        
    Returns:
        String terenkripsi, atau None jika input kosong
    """
    if not plain:
        return None
    
    cipher = get_cipher()
    encrypted = cipher.encrypt(plain.encode())
    return encrypted.decode()


def decrypt_api_key(encrypted: str) -> str:
    """
    Dekripsi API Key untuk digunakan
    
    Args:
        encrypted: API Key terenkripsi dari database
        
    Returns:
        API Key plaintext, atau None jika input kosong
    """
    if not encrypted:
        return None
    
    cipher = get_cipher()
    decrypted = cipher.decrypt(encrypted.encode())
    return decrypted.decode()


def mask_api_key(api_key: str, show_last: int = 4) -> str:
    """
    Mask API Key untuk ditampilkan di UI
    
    Args:
        api_key: API Key (bisa plaintext atau encrypted)
        show_last: Jumlah karakter terakhir yang ditampilkan
        
    Returns:
        String dengan mask, contoh: "••••••••••••1234"
    """
    if not api_key:
        return "••••••••"
    
    # Jika panjangnya pendek, return full masked
    if len(api_key) <= show_last + 4:
        return "••••••••"
    
    return "••••••••" + api_key[-show_last:]