// app/api/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { AISearchEngine } from '@/lib/ai-search-engine';
import { requireRole } from '@/lib/api-auth';

let searchEngine: AISearchEngine | null = null;

function getSearchEngine() {
  if (!searchEngine) {
    searchEngine = new AISearchEngine();
  }
  return searchEngine;
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "kitchen", "waitress", "pos", "stock_manager", "marketing", "finance"]);
    if (response) return response;
    
    const body = await request.json();
    const { query } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }
    

    
    const engine = getSearchEngine();
    const result = await engine.search(query);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Missing q parameter' },
      { status: 400 }
    );
  }
  
  return POST(new Request(request.url, {
    method: 'POST',
    body: JSON.stringify({ query }),
    headers: request.headers
  }) as NextRequest);
}
