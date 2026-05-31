import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../api/client';
import type { Movie, PagedResult } from '../types';

export interface MovieState {
  movies: Movie[];
  selectedMovie: Movie | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  searchTerm: string;
  selectedGenreId: number | null;
}

const initialState: MovieState = {
  movies: [],
  selectedMovie: null,
  status: 'idle',
  error: null,
  searchTerm: '',
  selectedGenreId: null,
};

export const fetchMovies = createAsyncThunk(
  'movies/fetchMovies',
  async (params: { searchTerm?: string; genreId?: number | null } = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<PagedResult<Movie>>('/movies', {
        params: {
          SearchTerm: params.searchTerm || undefined,
          GenreId: params.genreId || undefined,
          PageSize: 50,
        },
      });
      return response.data.items;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.Message || 'Failed to load movies catalog');
    }
  }
);

export const fetchMovieBySlug = createAsyncThunk(
  'movies/fetchMovieBySlug',
  async (slug: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<Movie>(`/movies/slug/${slug}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.Message || 'Failed to retrieve movie details');
    }
  }
);

const movieSlice = createSlice({
  name: 'movies',
  initialState,
  reducers: {
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setSelectedGenreId: (state, action) => {
      state.selectedGenreId = action.payload;
    },
    clearSelectedMovie: (state) => {
      state.selectedMovie = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch movies catalog
      .addCase(fetchMovies.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMovies.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.movies = action.payload;
      })
      .addCase(fetchMovies.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Fetch movie detail
      .addCase(fetchMovieBySlug.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMovieBySlug.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedMovie = action.payload;
      })
      .addCase(fetchMovieBySlug.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { setSearchTerm, setSelectedGenreId, clearSelectedMovie } = movieSlice.actions;
export default movieSlice.reducer;
