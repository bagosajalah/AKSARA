import os
import math
import logging
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.models.knowledge import KnowledgeBase

logger = logging.getLogger(__name__)

STOPWORDS: Set[str] = {
    'yang', 'dan', 'di', 'ke', 'dari', 'dengan', 'untuk', 'pada',
    'adalah', 'ini', 'itu', 'apa', 'bagaimana', 'kenapa', 'kapan',
    'siapa', 'dimana', 'saya', 'kamu', 'kita', 'sebagai', 'akan',
    'telah', 'oleh', 'juga', 'saja', 'pun', 'masih', 'dalam', 'atas',
    'per', 'seperti', 'tanpa', 'karena', 'antara', 'terhadap', 'selama',
    'bahwa', 'tersebut', 'merupakan', 'bisa', 'dapat', 'harus', 'mohon',
    'tolong', 'info', 'informasi', 'ada', 'tidak', 'gak', 'bukan',
    'lalu', 'setelah', 'sebelum', 'karena', 'sehingga', 'agar', 'supaya',
    'bagi', 'pada', 'atau', 'jika', 'kalau', 'apabila', 'meskipun',
    'walaupun', 'namun', 'tetapi', 'melainkan', 'sedangkan', 'sementara'
}


class RAGService:
    def __init__(self, db: AsyncSession, tenant_id: str, use_vector: bool = True):
        self.db = db
        self.tenant_id = tenant_id
        self.chroma_host = os.getenv('CHROMA_HOST', 'chromadb')
        self.chroma_port = os.getenv('CHROMA_PORT', '8000')
        self._chroma_available = None
        self.use_vector = use_vector and self._check_chroma_available()
        logger.info(f"RAGService initialized: tenant={tenant_id}, vector={self.use_vector}")

    def _check_chroma_available(self) -> bool:
        if self._chroma_available is not None:
            return self._chroma_available
        try:
            response = httpx.get(
                f"http://{self.chroma_host}:{self.chroma_port}/api/v1/heartbeat",
                timeout=2.0
            )
            self._chroma_available = response.status_code == 200
            if self._chroma_available:
                logger.info("ChromaDB available")
            else:
                logger.warning("ChromaDB not available")
        except:
            self._chroma_available = False
            logger.warning("ChromaDB not available")
        return self._chroma_available

    # FIXED: HELPER BARU: Generate embedding untuk query
    async def _get_query_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding untuk query pakai Gemini — API Key dari database tenant"""
        try:
            from google import genai
            from app.models.tenant import Tenant
            from app.utils.crypto import decrypt_api_key

            api_key = None
            try:
                result = await self.db.execute(
                    select(Tenant).where(Tenant.id == self.tenant_id)
                )
                tenant = result.scalars().first()
                
                if tenant and tenant.api_key_encrypted:
                    try:
                        api_key = decrypt_api_key(tenant.api_key_encrypted)
                        if api_key:
                            logger.info(f"API Key dari database tenant: {tenant.kode_dinas}")
                    except Exception as e:
                        logger.warning(f"Gagal dekripsi API Key: {e}")
            except Exception as e:
                logger.warning(f"Gagal ambil tenant dari database: {e}")
            
            # Fallback ke .env
            if not api_key:
                api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            
            if not api_key:
                logger.warning("GEMINI_API_KEY tidak ada (database & .env kosong)")
                return None
            
            client = genai.Client(api_key=api_key)
            result = client.models.embed_content(
                model="models/gemini-embedding-001",
                contents=text[:8000]
            )
            
            if result and result.embeddings:
                return result.embeddings[0].values
            return None
        except Exception as e:
            logger.warning(f"Failed to generate query embedding: {e}")
            return None

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5))
    async def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not query or not query.strip():
            return []

        keywords = self._extract_keywords(query)
        articles = await self._fetch_articles()
        if not articles:
            return []

        scored_results = []
        query_vector = self._text_to_vector(query.lower())

        for art in articles:
            score = self._calculate_score(art, query, keywords, query_vector)
            if score > 0.05:
                scored_results.append({
                    'id': str(art.id),
                    'judul': art.judul,
                    'konten': art.konten,
                    'kategori': art.kategori or "Umum",
                    'score': round(score, 4),
                    'source': 'hybrid'
                })

        if self.use_vector:
            chroma_results = await self._vector_search_chroma(query, top_k)
            if chroma_results:
                scored_results = self._merge_results(scored_results, chroma_results)

        scored_results.sort(key=lambda x: x['score'], reverse=True)
        
        min_score = 0.1
        filtered_results = [r for r in scored_results if r['score'] >= min_score]
        
        if filtered_results:
            logger.info(f"Found {len(filtered_results)} relevant results (from {len(scored_results)} candidates)")
            return filtered_results[:top_k]
        
        if scored_results:
            logger.warning(f"No results above threshold, returning top {min(top_k, len(scored_results))}")
            return scored_results[:top_k]
        
        logger.warning("No results found")
        return []

    async def _fetch_articles(self) -> List[Any]:
        try:
            query = select(KnowledgeBase).where(
                KnowledgeBase.tenant_id == self.tenant_id,
                KnowledgeBase.status == 'published'
            )
            result = await self.db.execute(query)
            articles = result.scalars().all()
            if not articles:
                query = select(KnowledgeBase).where(KnowledgeBase.tenant_id == self.tenant_id)
                result = await self.db.execute(query)
                articles = result.scalars().all()
            return articles
        except Exception as e:
            logger.error(f"Error fetching articles: {e}")
            return []

    def _calculate_score(self, article: Any, query: str, keywords: List[str], query_vector: Dict[str, float]) -> float:
        judul_lower = article.judul.lower()
        konten_lower = article.konten.lower()
        full_text = f"{judul_lower} {konten_lower}"

        kw_matches = sum(1 for kw in keywords if kw in full_text)
        title_matches = sum(1 for kw in keywords if kw in judul_lower)
        kw_score = (kw_matches * 1.0 + title_matches * 2.0) / (len(keywords) * 3.0 + 0.01)

        art_vector = self._text_to_vector(full_text)
        vec_sim = self._cosine_similarity(query_vector, art_vector)

        combined_score = (vec_sim * 0.6) + (kw_score * 0.4)

        boost_keywords = ["aksara", "ktp", "kk", "nik", "pendaftaran", "layanan"]
        for bk in boost_keywords:
            if bk in query.lower() and bk in full_text:
                combined_score += 0.1
        
        if query.lower() in judul_lower or query.lower() in konten_lower[:200]:
            combined_score += 0.15

        content_length = len(konten_lower)
        if 200 < content_length < 2000:
            combined_score += 0.05
        elif content_length > 5000:
            combined_score -= 0.05

        return min(combined_score, 1.0)

    def _extract_keywords(self, query: str) -> List[str]:
        words = query.lower().split()
        keywords = []
        for w in words:
            clean_w = w.strip('.,!?()[]"\'-')
            if len(clean_w) > 2 and clean_w not in STOPWORDS:
                keywords.append(clean_w)
        return list(set(keywords))

    def _text_to_vector(self, text: str) -> Dict[str, float]:
        words = []
        for w in text.split():
            clean_w = w.strip('.,!?()[]"\'-')
            if len(clean_w) > 2 and clean_w not in STOPWORDS:
                words.append(clean_w)
        freq: Dict[str, int] = {}
        for w in words:
            freq[w] = freq.get(w, 0) + 1
        length = math.sqrt(sum(v * v for v in freq.values()))
        if length > 0:
            return {k: v / length for k, v in freq.items()}
        return {}

    def _cosine_similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        if not vec1 or not vec2:
            return 0.0
        intersection = set(vec1.keys()) & set(vec2.keys())
        if not intersection:
            return 0.0
        return sum(vec1[k] * vec2[k] for k in intersection)

    # FIXED: Kirim query_embeddings, bukan query_texts
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3))
    async def _vector_search_chroma(self, query: str, top_k: int) -> List[Dict]:
        if not self.use_vector:
            return []
        
        collection_name = f"tenant_{self.tenant_id}"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # STEP 1: Cari collection_id
                list_url = (
                    f"http://{self.chroma_host}:{self.chroma_port}"
                    f"/api/v2/tenants/default_tenant/databases/default_database/collections"
                )
                list_response = await client.get(list_url)
                if list_response.status_code != 200:
                    logger.warning(f"ChromaDB list returned {list_response.status_code}")
                    return []
                
                collection_id = None
                for col in list_response.json():
                    if col.get("name") == collection_name:
                        collection_id = col.get("id")
                        break
                
                if not collection_id:
                    logger.warning(f"Collection {collection_name} not found")
                    return []
                
                # STEP 2: Generate embedding untuk query
                query_embedding = await self._get_query_embedding(query)
                if not query_embedding:
                    logger.warning("Failed to generate query embedding")
                    return []
                
                # STEP 3: Query dengan query_embeddings
                query_url = (
                    f"http://{self.chroma_host}:{self.chroma_port}"
                    f"/api/v2/tenants/default_tenant/databases/default_database"
                    f"/collections/{collection_id}/query"
                )
                
                response = await client.post(
                    query_url,
                    json={
                        "query_embeddings": [query_embedding],
                        "n_results": top_k,
                        "include": ["documents", "metadatas", "distances"]
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    
                    documents = data.get('documents', [[]])[0] if data.get('documents') else []
                    metadatas = data.get('metadatas', [[]])[0] if data.get('metadatas') else []
                    distances = data.get('distances', [[]])[0] if data.get('distances') else []
                    
                    for doc, meta, dist in zip(documents, metadatas, distances):
                        similarity = 1.0 - (float(dist) if dist else 0)
                        similarity = min(similarity * 1.1, 1.0)
                        
                        results.append({
                            'id': meta.get('id', '') if meta else '',
                            'judul': meta.get('judul', 'Dokumen') if meta else 'Dokumen',
                            'konten': doc,
                            'kategori': meta.get('kategori', 'Umum') if meta else 'Umum',
                            'score': round(max(0.0, similarity), 4),
                            'source': 'chromadb'
                        })
                    
                    logger.info(f"ChromaDB returned {len(results)} results")
                    return results
                else:
                    logger.warning(f"ChromaDB query {response.status_code}: {response.text[:300]}")
                    return []
                    
        except httpx.TimeoutException:
            logger.warning("ChromaDB timeout")
            self.use_vector = False
            return []
        except Exception as e:
            logger.warning(f"ChromaDB error: {e}")
            return []

    def _merge_results(self, list1: List[Dict], list2: List[Dict]) -> List[Dict]:
        seen = set()
        merged = []
        for r in list1 + list2:
            if r['id'] not in seen:
                seen.add(r['id'])
                merged.append(r)
        return merged

    def get_context(self, results: List[Dict], max_chars: int = 2000) -> str:
        if not results:
            return ""
        parts = []
        current_len = 0
        for i, r in enumerate(results, 1):
            konten = r['konten']
            if len(konten) > 1000:
                konten = konten[:1000] + "..."
            source_info = f"(dari {r['source']})" if r.get('source') else ""
            part = f"--- Referensi [{i}]: {r['judul']} (Kategori: {r['kategori']}) {source_info} ---\n{konten}"
            if current_len + len(part) > max_chars:
                remaining = max_chars - current_len
                if remaining > 50:
                    part = part[:remaining] + "..."
                else:
                    break
            parts.append(part)
            current_len += len(part)
        return "\n\n".join(parts)
    
    async def get_related_questions(self, query: str, top_k: int = 3) -> List[str]:
        return []